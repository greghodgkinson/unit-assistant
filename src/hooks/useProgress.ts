import { useState, useEffect } from 'react';
import { Progress, StudentAnswer, VelocityMetrics, TaskStatusChange } from '../types/Unit';

export const useProgress = (unitId: string) => {
  const STORAGE_KEY = `learning-assistant-progress-${unitId}`;
  
  const getInitialProgress = (): Progress => {
    console.log('getInitialProgress called for unitId:', unitId);
    if (!unitId) {
      return {
        unitId: '',
        currentLO: 'LO1',
        currentTask: '1.1',
        completedTasks: [],
        answers: [],
        startDate: new Date(),
        lastActivity: new Date()
      };
    }
    
    const saved = localStorage.getItem(STORAGE_KEY);
    console.log('Saved progress data:', saved);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log('Parsed progress:', parsed);
        return {
          ...parsed,
          unitId: unitId,
          startDate: new Date(parsed.startDate),
          lastActivity: new Date(parsed.lastActivity),
          answers: parsed.answers.map((answer: any) => ({
            ...answer,
            submissionDate: new Date(answer.submissionDate),
            lastModified: new Date(answer.lastModified),
            statusHistory: answer.statusHistory?.map((change: any) => ({
              ...change,
              timestamp: new Date(change.timestamp)
            })) || []
          }))
        };
      } catch (error) {
        console.error('Error parsing saved progress:', error);
      }
    }
    
    return {
      unitId: unitId,
      currentLO: 'LO1',
      currentTask: '1.1',
      completedTasks: [],
      answers: [],
      startDate: new Date(),
      lastActivity: new Date()
    };
  };

  const [progress, setProgress] = useState<Progress>(getInitialProgress);

  // Re-load progress when unitId changes or when explicitly refreshed
  useEffect(() => {
    if (!unitId) return;
    setProgress(getInitialProgress());
  }, [unitId]);

  // Force refresh function that can be called externally
  const refreshProgress = () => {
    setProgress(getInitialProgress());
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  const getTaskStatus = (taskId: string): 'not-started' | 'in-progress' | 'completed' => {
    const answer = progress.answers.find(a => a.taskId === taskId);
    if (!answer) return 'not-started';
    if (answer.isGoodEnough) return 'completed';
    return 'in-progress';
  };

  const addStatusChange = (taskId: string, newStatus: 'not-started' | 'in-progress' | 'completed') => {
    const currentStatus = getTaskStatus(taskId);
    if (currentStatus === newStatus) return; // No change needed

    const statusChange: TaskStatusChange = {
      timestamp: new Date(),
      status: newStatus,
      previousStatus: currentStatus
    };

    setProgress(prev => ({
      ...prev,
      answers: prev.answers.map(a => 
        a.taskId === taskId 
          ? { 
              ...a, 
              statusHistory: [...(a.statusHistory || []), statusChange],
              lastModified: new Date()
            }
          : a
      ),
      lastActivity: new Date()
    }));
  };

  const updateAnswer = (taskId: string, content: string) => {
    const currentStatus = getTaskStatus(taskId);
    const willBeInProgress = content.trim().length > 0;
    
    setProgress(prev => {
      const existingAnswer = prev.answers.find(a => a.taskId === taskId);
      const newStatus: 'not-started' | 'in-progress' | 'completed' = 
        existingAnswer?.isGoodEnough ? 'completed' : 
        willBeInProgress ? 'in-progress' : 'not-started';
      
      // Create status change if status is changing
      const statusChange: TaskStatusChange | null = 
        currentStatus !== newStatus ? {
          timestamp: new Date(),
          status: newStatus,
          previousStatus: currentStatus
        } : null;
      
      const newAnswers = existingAnswer
        ? prev.answers.map(a => 
            a.taskId === taskId 
              ? { 
                  ...a, 
                  content, 
                  lastModified: new Date(), 
                  version: a.version + 1,
                  statusHistory: statusChange 
                    ? [...(a.statusHistory || []), statusChange]
                    : (a.statusHistory || [])
                }
              : a
          )
        : [...prev.answers, {
            taskId,
            content,
            submissionDate: new Date(),
            lastModified: new Date(),
            version: 1,
            isGoodEnough: false,
            feedbackRequested: false,
            statusHistory: statusChange ? [statusChange] : []
          }];

      return {
        ...prev,
        answers: newAnswers,
        lastActivity: new Date()
      };
    });
  };

  const markTaskComplete = (taskId: string) => {
    setProgress(prev => ({
      ...prev,
      completedTasks: [...new Set([...prev.completedTasks, taskId])],
      lastActivity: new Date()
    }));
  };

  const markTaskIncomplete = (taskId: string) => {
    const answer = progress.answers.find(a => a.taskId === taskId);
    const newStatus = answer?.content?.trim() ? 'in-progress' : 'not-started';
    
    setProgress(prev => ({
      ...prev,
      completedTasks: prev.completedTasks.filter(id => id !== taskId),
      lastActivity: new Date()
    }));
  };

  const markAsGoodEnough = (taskId: string, isGoodEnough: boolean) => {
    const newStatus = isGoodEnough ? 'completed' : 'in-progress';
    addStatusChange(taskId, newStatus);
    
    setProgress(prev => ({
      ...prev,
      answers: prev.answers.map(a => 
        a.taskId === taskId ? { ...a, isGoodEnough } : a
      ),
      lastActivity: new Date()
    }));
  };

  const addFeedback = (taskId: string, feedback: string) => {
    setProgress(prev => ({
      ...prev,
      answers: prev.answers.map(a => 
        a.taskId === taskId ? { ...a, feedback, feedbackRequested: true, lastModified: new Date() } : a
      ),
      lastActivity: new Date()
    }));
  };

  const setCurrentTask = (loId: string, taskId: string) => {
    setProgress(prev => ({
      ...prev,
      currentLO: loId,
      currentTask: taskId,
      lastActivity: new Date()
    }));
  };

  const getVelocityMetrics = (totalTasks: number = 0): VelocityMetrics => {
    const now = new Date();
    const daysSinceStart = Math.max(1, Math.ceil((now.getTime() - progress.startDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    const goodEnoughAnswers = progress.answers.filter(a => a.isGoodEnough);
    
    return {
      totalAnswers: progress.answers.length,
      completedTasks: goodEnoughAnswers.length,
      averageTimeToCompletion: goodEnoughAnswers.length > 0 ? daysSinceStart / goodEnoughAnswers.length : 0,
      dailySubmissions: [], // Simplified for this implementation
      qualityTrend: [] // Simplified for this implementation
    };
  };

  const getNextTask = (learningOutcomes: any[] = []) => {
    // Create a map to avoid duplicate tasks and get unique tasks only
    const taskMap = new Map();
    learningOutcomes.forEach(lo => 
      lo.outcome_tasks.map(task => ({ loId: lo.id, taskId: task.id, task }))
        .forEach(taskInfo => {
          if (!taskMap.has(taskInfo.taskId)) {
            taskMap.set(taskInfo.taskId, taskInfo);
          }
        })
    );
    
    const allTasks = Array.from(taskMap.values());
    
    const currentIndex = allTasks.findIndex(t => t.taskId === progress.currentTask);
    const nextTask = allTasks[currentIndex + 1];
    
    return nextTask || null;
  };

  return {
    progress,
    refreshProgress,
    updateAnswer,
    markTaskComplete,
    markTaskIncomplete,
    markAsGoodEnough,
    addFeedback,
    setCurrentTask,
    getVelocityMetrics,
    getNextTask
  };
};