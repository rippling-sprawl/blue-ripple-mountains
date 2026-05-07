// MM/DD/YY → YYYY-MM-DD. Two-digit years <50 = 20xx, ≥50 = 19xx.
export function parseShortDate(input: string): string {
  const m = input.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) throw new Error(`Unrecognized date: ${input}`);
  const [, mm, dd, yy] = m;
  const year =
    yy.length === 4
      ? Number(yy)
      : Number(yy) < 50
        ? 2000 + Number(yy)
        : 1900 + Number(yy);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(Number(mm))}-${pad(Number(dd))}`;
}

export function formatShowDate(iso: string, isoEnd?: string | null): string {
  const fmt = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  };
  if (!isoEnd || isoEnd === iso) return fmt(iso);
  return `${fmt(iso)} – ${fmt(isoEnd)}`;
}
