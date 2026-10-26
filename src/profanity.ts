import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from "obscenity";

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

// Checks the text as typed, then again with punctuation removed,
// so tricks like putting a dot inside a word are caught too.
export const containsProfanity = (text: string): boolean => {
  if (!text) return false;
  if (matcher.hasMatch(text)) return true;
  const stripped = text.replace(/[^a-zA-Z0-9\s]/g, "");
  return stripped !== text && matcher.hasMatch(stripped);
};