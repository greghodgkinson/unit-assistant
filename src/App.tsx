import React, { useState } from 'react';
import { UnitOverview } from './components/UnitOverview';
import { ProgressDashboard } from './components/ProgressDashboard';
import { TaskView } from './components/TaskView';
import { useProgress } from './hooks/useProgress';
import { unitData } from './data/unit';
import { generateFeedback } from './utils/feedbackGenerator';

type View = 'overview' | 'dashboard' | 'task';

function App() {
  const [currentView, setCurrentView] = useState<View>('overview');
  const {
    progress,
    updateAnswer,
    markTaskComplete,
    markAsGoodEnough,
    addFeedback,
    setCurrentTask,
    getVelocityMetrics,
    getNextTask
  } = useProgress();

  const getCurrentLO = () => {
    return unitData.learning_outcomes.find(lo => lo.id === progress.currentLO);
  };

  const getCurrentTask = () => {
    const lo = getCurrentLO();
    return lo?.outcome_tasks.find(task => task.id === progress.currentTask);
  };

  const getCurrentAnswer = () => {
    return progress.answers.find(a => a.taskId === progress.currentTask);
  };

  const handleTaskSelect = (loId: string, taskId: string) => {
    setCurrentTask(loId, taskId);
    setCurrentView('task');
  };

  const handleAnswerUpdate = (content: string) => {
    updateAnswer(progress.currentTask, content);
  };

  const handleRequestFeedback = () => {
    const task = getCurrentTask();
    const answer = getCurrentAnswer();
    
    if (task && answer) {
      const feedback = generateFeedback(answer, task);
      addFeedback(progress.currentTask, feedback);
    }
  };

  const handleMarkComplete = () => {
    markAsGoodEnough(progress.currentTask, true);
    markTaskComplete(progress.currentTask);
  };

  const handleNavigateNext = () => {
    const nextTask = getNextTask();
    if (nextTask) {
      setCurrentTask(nextTask.loId, nextTask.taskId);
    }
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'overview':
        return (
          <UnitOverview
            unit={unitData}
            onStartLearning={() => setCurrentView('dashboard')}
          />
        );
      
      case 'dashboard':
        return (
          <ProgressDashboard
            progress={progress}
            metrics={getVelocityMetrics()}
            onTaskSelect={handleTaskSelect}
          />
        );
      
      case 'task':
        const lo = getCurrentLO();
        const task = getCurrentTask();
        const answer = getCurrentAnswer();
        const nextTask = getNextTask();
        
        if (!lo || !task) {
          return <div>Task not found</div>;
        }
        
        return (
          <TaskView
            learningOutcome={lo}
            task={task}
            answer={answer}
            onAnswerUpdate={handleAnswerUpdate}
            onRequestFeedback={handleRequestFeedback}
            onMarkComplete={handleMarkComplete}
            onNavigateBack={() => setCurrentView('dashboard')}
            onNavigateNext={handleNavigateNext}
            hasNext={!!nextTask}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Learning Assistant</h1>
              {currentView !== 'overview' && (
                <span className="ml-4 text-sm text-gray-600">
                  {unitData.title}
                </span>
              )}
            </div>
            
            {currentView !== 'overview' && (
              <nav className="flex space-x-4">
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'dashboard'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Dashboard
                </button>
              </nav>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderCurrentView()}
      </main>
    </div>
  );
}

export default App;