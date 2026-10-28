// Search normalization never changes the text displayed or exported to users.
export function searchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g, "")
    .replace(/[ٱأإآ]/g, "ا")
    .replace(/ـ/g, "")
    .toLowerCase()
    .trim();
}
