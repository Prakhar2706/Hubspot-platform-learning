export function question(prompt, options, answer, explanation) {
  return { prompt, options, answer, explanation };
}

export function lesson(details) {
  return {
    minutes: 12,
    access: 'Practice here without HubSpot',
    accessNote: 'Read, plan, and practice here for free. A real HubSpot account is optional for this lesson.',
    prerequisite: 'Complete the previous lesson, or use the glossary whenever a word is new.',
    ...details,
  };
}