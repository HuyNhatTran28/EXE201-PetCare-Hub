/**
 * Masks a bank account number for secure display.
 * Shows first 3 + last 3 digits, dots in between.
 * e.g. "1234567890" → "123••••890"
 * Short numbers (≤6 chars): shows last 2 only.
 * e.g. "12345" → "•••45"
 */
export function maskAccountNumber(account: string | null | undefined): string {
  if (!account) return account ?? '';
  const s = String(account).trim();
  if (s.length <= 6) {
    if (s.length <= 2) return '•'.repeat(s.length);
    return '•'.repeat(s.length - 2) + s.slice(-2);
  }
  return s.slice(0, 3) + '•'.repeat(s.length - 6) + s.slice(-3);
}
