/**
 * Resolve the public application origin behind a reverse proxy. Production
 * configuration wins over proxy headers so internal container hosts can never
 * leak into redirects.
 */
export function requestOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");

  if (configured) {
    const url = new URL(configured);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("Invalid application URL.");
    }
    return url.origin;
  }

  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();

  if (forwardedHost) {
    const forwardedProto = request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim();
    const protocol = forwardedProto === "http" ? "http" : "https";
    return new URL(`${protocol}://${forwardedHost}`).origin;
  }

  return new URL(request.url).origin;
}
