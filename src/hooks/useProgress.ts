import { useState, useEffect } from 'react';
import { Progress, StudentAnswer, VelocityMetrics } from '../types/Unit';
import { unitData } from '../data/unit';

const STORAGE_KEY = 'learning-assistant-progress';

export const useProgress = () => {
  const [progress, setProgress] = useState<Progress>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        startDate: new Date(parsed.startDate),
        lastActivity: new Date(parsed.lastActivity),
        answers: parsed.answers.map((answer: any) => ({
          ...answer,
          submissionDate: new Date(answer.submissionDate),
          lastModified: new Date(answer.lastModified)
        }))
      };
    }
    
    return {
      unitId: unitData.id,
      currentLO: 'LO1',
      currentTask: '1.1',
      completedTasks: [],
      answers: [],
      startDate: new Date(),
      lastActivity: new Date()
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  const updateAnswer = (taskId: string, content: string) => {
    setProgress(prev => {
      const existingAnswer = prev.answers.find(a => a.taskId === taskId);
      const newAnswers = existingAnswer
        ? prev.answers.map(a => 
            a.taskId === taskId 
              ? { ...a, content, lastModified: new Date(), version: a.version + 1 }
              : a
          )
        : [...prev.answers, {
            taskId,
            content,
            submissionDate: new Date(),
            lastModified: new Date(),
            version: 1,
            isGoodEnough: false,
            feedbackRequested: false
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

  const markAsGoodEnough = (taskId: string, isGoodEnough: boolean) => {
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
        a.taskId === taskId ? { ...a, feedback, feedbackRequested: true } : a
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

  const getVelocityMetrics = (): VelocityMetrics => {
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

  const getNextTask = () => {
    const allTasks = unitData.learning_outcomes.flatMap(lo => 
      lo.outcome_tasks.map(task => ({ loId: lo.id, taskId: task.id, task }))
    );
    
    const currentIndex = allTasks.findIndex(t => t.taskId === progress.currentTask);
    const nextTask = allTasks[currentIndex + 1];
    
    return nextTask || null;
  };

  return {
    progress,
    updateAnswer,
    markTaskComplete,
    markAsGoodEnough,
    addFeedback,
    setCurrentTask,
    getVelocityMetrics,
    getNextTask
  };
};