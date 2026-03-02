

export enum UserRole {
  ADMIN = 'admin',
  SCHOOL_OWNER = 'school_owner',
  TEACHER = 'teacher'
}

export type ActivityType = 'quiz' | 'discussion' | 'wordgame' | 'gapfill' | 'roleplay' | 'warmer';
export type ActivityStatus = 'draft' | 'approved' | 'archived';
export type WorkflowStage = 'uploading' | 'tagging' | 'extracting' | 'drafting' | 'approved';

// Question types for interactive mode
export type QuestionType = 
  | 'multiple-choice'
  | 'fill-blank'
  | 'matching'
  | 'true-false'
  | 'ordering'
  | 'open-ended'
  | 'multi-select';

export interface ActivityQuestion {
  id: number;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer?: string | string[] | number[];
  pairs?: { left: string; right: string }[];
  points?: number;
  hint?: string;
}

export interface InteractiveData {
  category?: string; // New: e.g., "Reading", "Grammar", "Vocabulary"
  activityType: string;
  instructions: string;
  questions: ActivityQuestion[];
  wordBank?: string[];
  timeLimit?: number | null;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  workspaceId: string | null;
  ownedWorkspaceId: string | null;
  defaultLevel: string;
  createdAt: number;
  lastActive: number;
}

export interface ClassTag {
  id: string;
  teacherId: string;
  name: string;
  schoolYear: string;
  color: string;
  studentCount: number;
  createdAt: any;
  isArchived: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  sharingEnabled: boolean;
  createdAt: number;
}

export interface Activity {
  id: string;
  userId: string;
  userEmail?: string;
  title: string;
  type: ActivityType | string;
  category?: string; // New: Top-level category for filtering
  level: string;
  duration?: number;
  status: ActivityStatus | string;
  teacherNotes: string;
  studentContent: string;
  answerKey: string | null;
  rawContent?: string;
  topic?: string;
  activityType?: string;
  source?: {
    publisher: string;
    bookTitle: string;
    pages: Array<{
      unitTags: string[];
      labelTags: string[];
    }>;
    pageCount: number;
    originalLength?: number; // New: For Delta tracking
    difficultyDelta?: number; // New: For Difficulty tracking
    remixScore?: number;
  };
  contentPool?: {
    vocabulary: string[];
    grammar: string[];
    vocabularyCount: number;
    grammarCount: number;
  };
  shapingSuggestions?: string[];
  sourcePageId?: string;
  createdAt: number;
  approvedAt?: number | null;
  updatedAt?: number;
  lastUsedAt?: number | null;
  timesUsed?: number;
  sharedWithWorkspace?: boolean;
  tags?: string[];
  isFavorite?: boolean;
  interactiveData?: InteractiveData;
}

export interface PageMetadata {
  id: string;
  userId: string;
  uploadedAt: number;
  publisher: string;
  publisherOther: string | null;
  bookTitle: string;
  unitPage: string | null;
  isTagged: boolean;
  extractedMetadata: {
    vocabularyCount: number;
    grammarPointsCount: number;
    topic: string;
    estimatedLevel: string;
    textType: string;
  };
}

export type PageSource = PageMetadata;

// "Digital Twin" of a Book/Source
export interface ContentAsset {
  id: string; // usually bookTitle
  bookTitle: string;
  publisher: string;
  totalRemixes: number;
  totalInteractions: number;
  cumulativeDelta: number;
  cumulativeDifficultyChange: number;
  generatedTypes?: Record<string, number>; // Map of 'quiz': 5, 'discussion': 2
  lastInteractionTimestamp: any;
  
  // Data Intelligence Extensions
  usageCount?: number;
  remixScore?: number;
  totalTokens?: number;
  vocabularyUsed?: string[];
  grammarUsed?: string[];
  lastUsed?: any;
}

export interface AnalyticsEvent {
  id: string;
  type: 'page_upload' | 'activity_created' | 'activity_approved' | 'activity_used';
  userId: string;
  workspaceId: string | null;
  publisher: string;
  bookTitle: string;
  activityType: ActivityType | string | null;
  level: string | null;
  shapingDuration: number | null;
  timestamp: number;
}

export interface StudioState {
  activities: Activity[];
  pages: PageMetadata[];
  currentWorkspace: Workspace | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'partner';
  text: string;
  timestamp: number;
}

export interface SourceMaterial {
  id: string;
  title: string;
  type: string;
  content: string;
  createdAt: number;
}

export interface WorkbenchItem {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'approved';
  sourceIds: string[];
  lastModified: number;
}

export interface Material {
  id: string;
  teacherId: string;
  title: string;
  publisher: string;
  bookTitle: string;
  unitTags: string[];
  labelTags: string[];
  vocabulary: string[];
  grammar: string[];
  topic: string;
  level: string;
  pageCount: number;
  isFavorite: boolean;
  createdAt: any;
  lastUsedAt: any | null;
  timesUsed: number;
  ocrTexts?: string[];
}

export interface TeacherLabel {
  id: string;
  teacherId: string;
  name: string;
  color: string;
  usageCount: number;
  createdAt: any;
}