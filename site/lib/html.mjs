/** Tiny HTML helpers. Everything on the site is escaped through `h`. */

export const h = (value) =>
  String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const n = (value) => new Intl.NumberFormat("en-US").format(value);

export const list = (items, render) => items.map(render).join("\n");

export const when = (condition, render) => (condition ? render() : "");

export const slug = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const shortDigest = (value, head = 10) =>
  typeof value === "string" && value.length > head * 2
    ? `${value.slice(0, head)}…${value.slice(-4)}`
    : String(value ?? "");

export const countOf = (value) =>
  Array.isArray(value) ? value.length : Number(value ?? 0);

export const plural = (count, singular, pluralForm = `${singular}s`) =>
  `${count} ${count === 1 ? singular : pluralForm}`;
