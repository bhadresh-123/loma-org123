
export function isPoBox(address: string): boolean {
  const poBoxPatterns = [
    /\bp\.?\s*o\.?\s*box\b/i,
    /\bpost\s*office\s*box\b/i,
    /\bp\.?\s*o\.?\s*drawer\b/i,
    /\bpob\s*#?\b/i,
    /\bp\.?\s*o\.?\s*#\b/i
  ];
  
  return poBoxPatterns.some(pattern => pattern.test(address));
}
