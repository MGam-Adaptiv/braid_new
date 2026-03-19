export type ActivityTypeDefinition = {
  id: string;
  name: string;
  uiLabel: string;
  category: 'grammar' | 'vocabulary' | 'mixed';
  format: 'print' | 'online' | 'both';
  promptTemplate: string;
};

export const ACTIVITY_TYPES: ActivityTypeDefinition[] = [
  // ── Grammar ────────────────────────────────────────────────────────────────
  {
    id: 'gap_fill',
    name: 'Gap fill',
    uiLabel: 'Fill in the blanks',
    category: 'grammar',
    format: 'both',
    promptTemplate:
      'Generate a gap fill exercise using [TENSE]. Remove [VOCABULARY SET] words from the text and replace with blanks. Provide a word bank: [WORD BANK: YES/NO].',
  },
  {
    id: 'multiple_choice_grammar',
    name: 'Multiple choice',
    uiLabel: 'Multiple choice (grammar)',
    category: 'grammar',
    format: 'both',
    promptTemplate:
      'Generate 8 multiple choice questions testing [TENSE]. Each item has 1 correct answer + 3 distractors. Distractors must be plausible but grammatically wrong.',
  },
  {
    id: 'error_correction',
    name: 'Error correction',
    uiLabel: 'Find & fix the error',
    category: 'grammar',
    format: 'print',
    promptTemplate:
      'Write 8 sentences containing one grammatical error each, targeting [TENSE]. Mark the error type in the answer key only.',
  },
  {
    id: 'sentence_transformation',
    name: 'Sentence transformation',
    uiLabel: 'Rewrite the sentence',
    category: 'grammar',
    format: 'print',
    promptTemplate:
      'Generate 8 sentence transformation tasks. Student rewrites the sentence using [TENSE] without changing the meaning. Include a sentence starter where helpful.',
  },
  {
    id: 'sentence_ordering',
    name: 'Sentence ordering',
    uiLabel: 'Unscramble / order',
    category: 'grammar',
    format: 'both',
    promptTemplate:
      'Create 6 scrambled sentences using [TENSE]. Words are given out of order; student reconstructs. Suitable for drag-and-drop in online version.',
  },
  {
    id: 'matching_halves',
    name: 'Matching (halves)',
    uiLabel: 'Match the sentence halves',
    category: 'grammar',
    format: 'both',
    promptTemplate:
      'Generate 8 split sentences testing [TENSE]. Column A = sentence starters, Column B = endings. One correct match per item.',
  },
  {
    id: 'drag_drop',
    name: 'Drag & drop',
    uiLabel: 'Drag into sentence',
    category: 'grammar',
    format: 'online',
    promptTemplate:
      'Generate 8 drag-and-drop items. Each sentence has one blank; word options (1 correct + 2 distractors) appear as draggable tokens. Target: [TENSE].',
  },
  {
    id: 'dropdown_select',
    name: 'Dropdown select',
    uiLabel: 'Choose the correct form',
    category: 'grammar',
    format: 'online',
    promptTemplate:
      'Write 8 sentences each with one dropdown blank targeting [TENSE]. 3 options per blank: correct form + 2 plausible distractors.',
  },

  // ── Vocabulary ─────────────────────────────────────────────────────────────
  {
    id: 'word_definition_match',
    name: 'Word-definition match',
    uiLabel: 'Vocabulary matching',
    category: 'vocabulary',
    format: 'both',
    promptTemplate:
      'Generate a matching activity for [VOCABULARY SET]. Column A = target words, Column B = definitions or synonyms. 8–10 pairs.',
  },
  {
    id: 'gap_fill_vocab',
    name: 'Gap fill with word bank',
    uiLabel: 'Fill in the blanks (vocab)',
    category: 'vocabulary',
    format: 'both',
    promptTemplate:
      'Write a 100–150 word text using [TOPIC] and [TENSE]. Remove [VOCABULARY SET] words and list them as a word bank. Students complete the text.',
  },
  {
    id: 'crossword',
    name: 'Crossword',
    uiLabel: 'Crossword puzzle',
    category: 'vocabulary',
    format: 'print',
    promptTemplate:
      'Generate a crossword for [VOCABULARY SET]. Clues as definitions, example sentences (with blank), or synonyms. 10–12 words.',
  },
  {
    id: 'categorisation',
    name: 'Categorisation table',
    uiLabel: 'Sort into categories',
    category: 'vocabulary',
    format: 'both',
    promptTemplate:
      'Create a sorting task for [VOCABULARY SET]. Provide a mixed list and 2–3 category column headers. Students place each word in the correct column.',
  },
  {
    id: 'collocation_match',
    name: 'Collocation matching',
    uiLabel: 'Match collocations',
    category: 'vocabulary',
    format: 'both',
    promptTemplate:
      'Generate 10 collocation pairs from [VOCABULARY SET] (e.g. verb+noun, adj+noun). Shuffle and present as two columns to match.',
  },
  {
    id: 'cloze_text',
    name: 'Cloze text',
    uiLabel: 'Every-nth-word cloze',
    category: 'vocabulary',
    format: 'both',
    promptTemplate:
      'Write a 150-word text on [TOPIC]. Remove every 7th word to create a cloze. No word bank. Answers inferred from context.',
  },
  {
    id: 'flashcards',
    name: 'Flashcards',
    uiLabel: 'Vocabulary flashcards',
    category: 'vocabulary',
    format: 'online',
    promptTemplate:
      'Generate 12 flashcard pairs for [VOCABULARY SET]. Front = word + example sentence with blank. Back = definition + full sentence.',
  },

  // ── Mixed / Text-based ─────────────────────────────────────────────────────
  {
    id: 'true_false_ng',
    name: 'True / False / NG',
    uiLabel: 'True / False / NG',
    category: 'mixed',
    format: 'both',
    promptTemplate:
      'Write a 120–150 word reading passage on [TOPIC] using [TENSE]. Generate 6 T/F/NG statements — at least one of each type. Answers align strictly with text.',
  },
  {
    id: 'comprehension_qa',
    name: 'Comprehension Q&A',
    uiLabel: 'Reading comprehension',
    category: 'mixed',
    format: 'both',
    promptTemplate:
      'Write a 120–150 word passage on [TOPIC] using [TENSE]. Generate 5 comprehension questions — mix of factual and inferential. Include model answers.',
  },
  {
    id: 'embedded_gap_fill',
    name: 'Embedded gap fill',
    uiLabel: 'Text with gaps (reading+grammar)',
    category: 'mixed',
    format: 'both',
    promptTemplate:
      'Write a 150-word passage on [TOPIC]. Embed 8–10 gaps targeting [TENSE] and [VOCABULARY SET]. Word bank: [WORD BANK: YES/NO].',
  },
  {
    id: 'timed_quiz',
    name: 'Timed quiz',
    uiLabel: 'Timed grammar/vocab quiz',
    category: 'mixed',
    format: 'online',
    promptTemplate:
      'Generate 10 timed quiz items mixing [TENSE] grammar and [VOCABULARY SET]. MCQ format. Include score tracking. Randomise question order.',
  },
  {
    id: 'speaking_cards',
    name: 'Discussion / speaking cards',
    uiLabel: 'Speaking prompt cards',
    category: 'mixed',
    format: 'print',
    promptTemplate:
      'Generate 8 discussion question cards on [TOPIC]. Each question targets [TENSE] in natural use. Include a follow-up prompt per card. Suitable for pair/group work.',
  },
];

export const WORD_BANK_TYPES = ['gap_fill', 'gap_fill_vocab', 'embedded_gap_fill'];
