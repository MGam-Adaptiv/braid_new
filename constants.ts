
export const BRAND_NAME = 'BraidStudio';
export const PARTNER_NAME = 'Drafting Partner';

export const COLORS = {
  coral: '#EF3D5A',
  coralLight: '#FEE2E6',
  black: '#000000',
  success: '#10B981',
  successLight: '#D1FAE5',
  darkGray: '#1F2937',
  mediumGray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
};

export const MOCK_SOURCES = [
  { id: '1', title: 'Grade 5 Math Curriculum.pdf', type: 'pdf', content: 'Math fundamentals...', createdAt: Date.now() },
  { id: '2', title: 'Science Lesson Plan - Volcanoes', type: 'text', content: 'Explaining magma...', createdAt: Date.now() - 10000 },
];

export const MOCK_WORKBENCH = [
  { id: 'w1', title: 'Fractions Introduction', content: 'Starting with simple halves and quarters...', status: 'approved', sourceIds: ['1'], lastModified: Date.now() },
  { id: 'w2', title: 'Draft: Volcano Quiz', content: '1. What is magma?\n2. Name three volcanoes...', status: 'draft', sourceIds: ['2'], lastModified: Date.now() - 5000 },
];
