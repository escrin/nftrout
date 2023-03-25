let dictionary: Set<string>;

const dictP = import('./dictionary.json')
  .then((dict) => (dictionary = new Set(dict.default)))
  .catch((e: any) => {
    console.error('failed to download dictionary', e);
  });

/** Check with best effort. Gracefully degrades if the dictionary is unavailable. */
export function checkBestEffort(word: string): boolean {
  if (dictionary.size === 0) return word.length === 5;
  return dictionary.has(word);
}

export async function check(word: string): Promise<boolean> {
  await dictP;
  return dictionary.has(word);
}
