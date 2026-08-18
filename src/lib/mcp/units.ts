/**
 * Percent-shaped assumptions are named consistently across the schema, so the
 * unit can be read off the field name instead of being stored. Shared by
 * `get_project`, `get_missing_assumptions`, and `get_writable_paths` so the
 * three never disagree.
 */
export function assumptionUnit(path: string): "percent" | "number or currency" {
  return /Pct|Rate|Margin|Churn|Conversion|Share/i.test(path) ? "percent" : "number or currency";
}
