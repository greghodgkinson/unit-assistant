export interface AcceptanceCriteria {
  id: string;
  criteria: string;
}

export interface TaskItem {
  id: string;
  description: string;
  type: 'standard' | 'merit' | 'distinction';
  acceptance_criteria: AcceptanceCriteria[];
}

export interface IndicativeContent {
  description: string;
}

export interface LearningOutcome {
  id: string;
  description: string;
  outcome_tasks: TaskItem[];
  indicative_content: IndicativeContent[];
}

export interface Unit {
  id: string;
  title: string;
  instructions: string;
  scenario: string;
  task?: string; // Optional for backwards compatibility
  unit_tasks?: UnitTask[]; // New field for multiple tasks
  learning_outcomes: LearningOutcome[];
  credits?: number;
  guided_learning_hours?: number;
}

export interface UnitTask {
  id: string;
  description: string;
  learning_outcomes: string[];
  outcome_tasks: string[];
}

export interface StudentAnswer {
  taskId: string;
  content: string;
  submissionDate: Date;
  lastModified: Date;
  version: number;
  isGoodEnough: boolean;
  feedbackRequested: boolean;
  feedback?: string;
}

export interface Progress {
  unitId: string;
  currentLO: string;
  currentTask: string;
  completedTasks: string[];
  answers: StudentAnswer[];
  startDate: Date;
  lastActivity: Date;
}

export interface VelocityMetrics {
  totalAnswers: number;
  completedTasks: number;
  averageTimeToCompletion: number;
  dailySubmissions: { date: string; count: number }[];
  qualityTrend: { date: string; goodEnoughRate: number }[];
}

export interface UnitSummary {
  id: string;
  title: string;
  totalTasks: number;
  completedTasks: number;
  lastActivity?: Date;
  dateAdded: Date;
}