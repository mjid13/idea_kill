import { afterEach, describe, expect, it } from "vitest";
import { requestOrigin } from "../requestOrigin";

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  if (originalAppUrl === undefined) {
    delete process.env.NEXT_PUBLIC_APP_URL;
  } else {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  }
});

describe("requestOrigin", () => {
  it("prefers the configured public URL over an internal request URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://ideaup.example.com/";
    const request = new Request("https://localhost:8080/api/settings/connections");

    expect(requestOrigin(request)).toBe("https://ideaup.example.com");
  });

  it("uses forwarded headers when no public URL is configured", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const request = new Request("http://localhost:8080/settings", {
      headers: {
        "x-forwarded-host": "ideaup.example.com",
        "x-forwarded-proto": "https",
      },
    });

    expect(requestOrigin(request)).toBe("https://ideaup.example.com");
  });

  it("falls back to the request origin in local development", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(requestOrigin(new Request("http://localhost:3000/settings"))).toBe(
      "http://localhost:3000",
    );
  });
});
