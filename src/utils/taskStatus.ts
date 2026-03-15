import { TaskStatus, StudentAnswer } from '../types/Unit';

export const VALID_TRANSITIONS: Partial<Record<TaskStatus, TaskStatus[]>> = {
  'not-started':          ['in-progress'],
  'in-progress':          ['not-started', 'completed'],
  'completed':            ['in-progress', 'submitted-for-review'],
  'submitted-for-review': ['not-yet-achieved', 'achieved'],
  'not-yet-achieved':     ['in-progress', 'completed', 'submitted-for-review'],
  'achieved':             [],
};

export const deriveTaskStatus = (answer: StudentAnswer | undefined): TaskStatus => {
  if (!answer) return 'not-started';
  if (answer.statusHistory && answer.statusHistory.length > 0) {
    return answer.statusHistory[answer.statusHistory.length - 1].status;
  }
  // Legacy fallback for data that pre-dates statusHistory
  if (answer.isGoodEnough) return 'completed';
  if (answer.content?.trim()) return 'in-progress';
  return 'not-started';
};

export const getTimestampForStatus = (answer: StudentAnswer | undefined, status: TaskStatus): Date | undefined => {
  return answer?.statusHistory?.find(c => c.status === status)?.timestamp;
};

export const getLatestTimestampForStatus = (answer: StudentAnswer | undefined, status: TaskStatus): Date | undefined => {
  const entries = answer?.statusHistory?.filter(c => c.status === status) || [];
  return entries.length > 0 ? entries[entries.length - 1].timestamp : undefined;
};

export const isEditable = (status: TaskStatus): boolean => {
  return status === 'not-started' || status === 'in-progress' || status === 'not-yet-achieved';
};
