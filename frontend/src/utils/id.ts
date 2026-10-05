/** Random id for client-side records (watchlists, alert rules, alert events). */
export function createId(): string {
  return crypto.randomUUID()
}
