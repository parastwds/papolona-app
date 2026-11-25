// One step counter runs through the whole intro: 5 opening screens (1–5),
// 8 questionnaire questions (6–13), then the intro video (14), after which
// sign-up opens.
export const OPENING_STEPS = 5;
export const QUESTIONNAIRE_STEPS = 8;
export const INTRO_VIDEO_STEP = OPENING_STEPS + QUESTIONNAIRE_STEPS + 1;
export const TOTAL_INTRO_STEPS = INTRO_VIDEO_STEP;

// Mark's narrated intro video (a Vimeo link or a direct video URL), shown on
// its own intro screen. Leave empty to show a "coming soon" card.
export const INTRO_VIDEO_URL = 'https://vimeo.com/1242270567';
