// Clue strings are set in Doto (ExtraBold), a dot matrix face that reads like an
// instrument readout, a nod to the quantum source of every clue. Loaded in App.tsx.
export const CLUE_FONT = 'Doto';

// Montserrat Alternates: geometric letters with Art Deco alternate shapes, in several weights.
// Each weight is its own font file (loaded in App.tsx), so pick the weight by family name here,
// never with fontWeight.
export const MONTSERRAT_ALT = {
  light: 'MontserratAlternatesLight',
  regular: 'MontserratAlternatesRegular',
  medium: 'MontserratAlternatesMedium',
} as const;

// Screen titles such as "Question 1". To make them heavier or lighter, switch to another MONTSERRAT_ALT weight.
export const TITLE_FONT = MONTSERRAT_ALT.light;

// Its companion for readable lines under those titles, such as the question itself: Josefin Sans,
// a geometric face with the same 1920s feel. Each weight is its own file; don't set fontWeight.
// Regular reads with more presence; 'JosefinSansLight' is the thinner option.
export const THIN_TEXT_FONT = 'JosefinSansRegular';
