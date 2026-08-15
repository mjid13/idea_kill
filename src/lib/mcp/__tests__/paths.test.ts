import { describe, expect, it } from "vitest";
import { normalizeMcpPath, publicMcpPath } from "../paths";
import { toJsonSafe } from "../serialization";

describe("MCP public paths", () => {
  it.each([
    ["one_pager.problem", "onePager.problem"],
    ["unit_economics.revenuePerCustomer.value", "unitEconomics.revenuePerCustomer.value"],
    ["basic.name", "basicInfo.name"],
    ["pricing.productPrice.value", "pricing.productPrice.value"],
  ])("normalizes %s", (publicPath, internalPath) => {
    expect(normalizeMcpPath(publicPath)).toBe(internalPath);
  });

  it("converts internal paths back to public paths", () => {
    expect(publicMcpPath("onePager.problem")).toBe("one_pager.problem");
    expect(publicMcpPath("unitEconomics.revenuePerCustomer.value")).toBe("unit_economics.revenuePerCustomer.value");
  });
});

describe("MCP JSON serialization", () => {
  it("removes undefined properties and replaces non-finite numbers", () => {
    expect(toJsonSafe({ missing: undefined, infinite: Infinity, nested: [undefined, NaN] })).toEqual({
      infinite: null, nested: [null, null],
    });
  });
});

