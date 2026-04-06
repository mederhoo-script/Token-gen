export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatSupply(supply: number): string {
  if (supply >= 1_000_000_000) return `${(supply / 1_000_000_000).toFixed(2)}B`;
  if (supply >= 1_000_000) return `${(supply / 1_000_000).toFixed(2)}M`;
  if (supply >= 1_000) return `${(supply / 1_000).toFixed(2)}K`;
  return supply.toLocaleString();
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
