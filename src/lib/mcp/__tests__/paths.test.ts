import { describe, expect, it } from "vitest";
import { normalizeMcpPath, publicMcpPath, SECTION_KEY_MAP } from "../paths";
import { toJsonSafe } from "../serialization";

describe("MCP public paths", () => {
  it.each([
    ["one_pager.problem", "onePager.problem"],
    ["unit_economics.revenuePerCustomer.value", "unitEconomics.revenuePerCustomer.value"],
    ["basic.name", "basicInfo.name"],
    ["pricing.productPrice.value", "pricing.productPrice.value"],
    ["marketplace.takeRatePct.value", "marketplace.takeRatePct.value"],
    ["debt.loanAmount.value", "debt.loanAmount.value"],
  ])("normalizes %s", (publicPath, internalPath) => {
    expect(normalizeMcpPath(publicPath)).toBe(internalPath);
  });

  it("converts internal paths back to public paths", () => {
    expect(publicMcpPath("onePager.problem")).toBe("one_pager.problem");
    expect(publicMcpPath("unitEconomics.revenuePerCustomer.value")).toBe("unit_economics.revenuePerCustomer.value");
  });

  it("covers marketplace and debt, which have a form only through MCP", () => {
    expect(SECTION_KEY_MAP.marketplace).toBe("marketplace");
    expect(SECTION_KEY_MAP.debt).toBe("debt");
  });

  it("maps a bracketed root without disturbing the item selector", () => {
    expect(normalizeMcpPath("revenue_streams[rs_1].price.value")).toBe("revenueStreams[rs_1].price.value");
    expect(publicMcpPath("revenueStreams[rs_1].price.value")).toBe("revenue_streams[rs_1].price.value");
    // collectRangedFields emits index selectors, so those must map too.
    expect(publicMcpPath("revenueStreams[0].price")).toBe("revenue_streams[0].price");
  });

  it("passes an unknown root through untouched, bracketed or not", () => {
    expect(normalizeMcpPath("mystery[42].field")).toBe("mystery[42].field");
    expect(publicMcpPath("mystery.field")).toBe("mystery.field");
  });
});

describe("MCP JSON serialization", () => {
  it("removes undefined properties and replaces non-finite numbers", () => {
    expect(toJsonSafe({ missing: undefined, infinite: Infinity, nested: [undefined, NaN] })).toEqual({
      infinite: null, nested: [null, null],
    });
  });
});
