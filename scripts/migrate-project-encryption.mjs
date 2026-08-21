import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const ROTATE = process.argv.includes("--rotate");
const PAGE_SIZE = 100;
const marker = (value) => value && typeof value === "object" && value._ideaup_encrypted === true;

function fail(message) { throw new Error(message); }

function configuration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const activeKeyId = process.env.PROJECT_ENCRYPTION_ACTIVE_KEY_ID;
  if (!url || !serviceKey || !activeKeyId) fail("Missing migration configuration.");
  let source;
  try { source = JSON.parse(process.env.PROJECT_ENCRYPTION_KEYS ?? ""); } catch { fail("Invalid key configuration."); }
  if (!source || typeof source !== "object" || Array.isArray(source)) fail("Invalid key configuration.");
  const keys = new Map();
  for (const [keyId, encoded] of Object.entries(source)) {
    if (typeof encoded !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) fail("Invalid key configuration.");
    const key = Buffer.from(encoded, "base64");
    if (!/^[A-Za-z0-9._-]{1,100}$/.test(keyId) || key.length !== 32) fail("Invalid key configuration.");
    keys.set(keyId, key);
  }
  if (!keys.has(activeKeyId)) fail("Active migration key is unavailable.");
  return { url, serviceKey, activeKeyId, keys };
}

function aad(projectId) { return Buffer.from(`ideaup:project:v1:${projectId}`, "utf8"); }

function decodePart(value, size) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) fail("Invalid encrypted row.");
  const decoded = Buffer.from(value, "base64url");
  if (decoded.toString("base64url") !== value || decoded.length === 0 || (size && decoded.length !== size)) {
    fail("Invalid encrypted row.");
  }
  return decoded;
}

function decrypt(projectId, envelope, keys) {
  if (envelope.version !== 1 || envelope.algorithm !== "A256GCM" || !keys.has(envelope.keyId)) {
    fail("Encrypted row uses an unavailable format or key.");
  }
  try {
    const decipher = createDecipheriv("aes-256-gcm", keys.get(envelope.keyId), decodePart(envelope.nonce, 12));
    decipher.setAAD(aad(projectId));
    decipher.setAuthTag(decodePart(envelope.tag, 16));
    return JSON.parse(Buffer.concat([
      decipher.update(decodePart(envelope.ciphertext)), decipher.final(),
    ]).toString("utf8"));
  } catch {
    fail("Encrypted row could not be authenticated.");
  }
}

function encrypt(projectId, value, activeKeyId, key) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("Project row is not a JSON object.");
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(aad(projectId));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return {
    _ideaup_encrypted: true, version: 1, algorithm: "A256GCM", keyId: activeKeyId,
    nonce: nonce.toString("base64url"), ciphertext: ciphertext.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
  };
}

async function main() {
  const config = configuration();
  const db = createClient(config.url, config.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const counts = { scanned: 0, encrypted: 0, rotated: 0, skipped: 0, conflicted: 0, failed: 0 };
  let from = 0;
  for (;;) {
    const { data, error } = await db.from("projects").select("id,data,revision").order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) fail("Could not read a migration batch.");
    if (!data?.length) break;
    for (const row of data) {
      counts.scanned += 1;
      try {
        const alreadyEncrypted = marker(row.data);
        if (alreadyEncrypted && (!ROTATE || row.data.keyId === config.activeKeyId)) {
          decrypt(row.id, row.data, config.keys);
          counts.skipped += 1;
          continue;
        }
        const plaintext = alreadyEncrypted ? decrypt(row.id, row.data, config.keys) : row.data;
        const envelope = encrypt(row.id, plaintext, config.activeKeyId, config.keys.get(config.activeKeyId));
        if (JSON.stringify(decrypt(row.id, envelope, config.keys)) !== JSON.stringify(plaintext)) fail("Round-trip verification failed.");
        if (!APPLY) {
          counts[alreadyEncrypted ? "rotated" : "encrypted"] += 1;
          continue;
        }
        const { data: updated, error: updateError } = await db.from("projects").update({ data: envelope })
          .eq("id", row.id).eq("revision", row.revision).select("id,data").maybeSingle();
        if (updateError) fail("Project update failed.");
        if (!updated) { counts.conflicted += 1; continue; }
        decrypt(updated.id, updated.data, config.keys);
        counts[alreadyEncrypted ? "rotated" : "encrypted"] += 1;
      } catch {
        counts.failed += 1;
      }
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  console.info(JSON.stringify({ mode: APPLY ? "apply" : "dry-run", rotate: ROTATE, ...counts }));
  if (counts.failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Migration failed.");
  process.exitCode = 1;
});
