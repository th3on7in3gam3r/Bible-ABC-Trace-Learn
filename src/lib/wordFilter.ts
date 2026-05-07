/**
 * Client-side word filter for kids' app.
 * Checks against a list of profanity/slur roots using substring matching.
 * Intentionally does NOT log or expose the blocked words to the UI.
 */

// Root stems — the filter checks if the input CONTAINS any of these as a substring.
// Using roots rather than exact words catches plurals, conjugations, and variations.
const BLOCKED_ROOTS: string[] = [
  // Profanity
  'fuck','fuk','fck','shit','sht','cunt','cnt','bitch','btch','ass','arse',
  'cock','cok','dick','dik','piss','pis','prick','prik','slut','slt',
  'whore','whor','bastard','bastar','damn','dammit','crap','fag','fags',
  'nigger','nigga','nigg','spic','spik','kike','chink','gook','wetback',
  'retard','retrd','dyke','twat','wank','jerk','poop','poo','butt',
  'boob','boobs','tit','tits','titt','penis','vagina','vag','anus',
  'anal','sex','sexy','porn','nude','naked','kill','murder','rape',
  'molest','abuse','drug','meth','heroin','cocaine','weed','dope',
  'hell','hel','satan','devil','666','nazi','hate',
];

/**
 * Returns true if the word is safe to display.
 * Returns false if it matches any blocked root.
 */
export function isWordSafe(word: string): boolean {
  const normalized = word.toLowerCase().replace(/[^a-z]/g, '');
  if (normalized.length === 0) return true;
  return !BLOCKED_ROOTS.some(root => normalized.includes(root));
}
