export function parseTrackNumber(position: string): number | undefined {
  if (position.trim() === "") {
    return undefined;
  }
  const parsed = Number(position);
  return Number.isInteger(parsed) ? parsed : undefined;
}
