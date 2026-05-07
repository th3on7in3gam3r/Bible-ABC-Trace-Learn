/**
 * Client-side word filter for kids' app.
 * Checks against a list of profanity/slur roots using smart boundary matching.
 * Intentionally does NOT log or expose the blocked words to the UI.
 *
 * Strategy:
 *  - Long roots (4+ chars): substring match — catches conjugations/plurals
 *  - Short roots (1-3 chars): whole-word match only — prevents false positives
 *    on innocent words like GRASS (contains "ass"), HELP (contains "hel"),
 *    MASS, PASS, CLASS, HELLO, SHELTER, etc.
 */

// Long roots (4+ chars) — substring match
const LONG_ROOTS: string[] = [
  'fuck','fuk','shit','cunt','bitch','arse','cock','dick','piss',
  'prick','slut','whore','whor','bastard','bastar','damn','dammit',
  'crap','fags','nigg','spic','spik','kike','chink','gook','wetback',
  'retard','retrd','dyke','twat','wank','boob','tits','titt','penis',
  'vagina','anus','anal','sexy','porn','nude','naked','kill','murder',
  'rape','molest','abuse','meth','heroin','cocaine','satan','devil',
  'nazi','hate',
];

// Short roots (1-3 chars) — whole-word match only
const SHORT_ROOTS: string[] = [
  'ass','fag','vag','sex','poo','tit','666',
];

/**
 * Returns true if the word is safe to display.
 * Returns false if it matches any blocked root.
 */
export function isWordSafe(word: string): boolean {
  const normalized = word.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalized.length === 0) return true;

  // Long roots: simple substring check
  if (LONG_ROOTS.some(root => normalized.includes(root))) return false;

  // Short roots: only block if the root IS the entire word
  if (SHORT_ROOTS.some(root => normalized === root)) return false;

  return true;
}
