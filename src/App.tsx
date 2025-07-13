import React, { useState } from 'react';
import { UnitOverview } from './components/UnitOverview';
import { ProgressDashboard } from './components/ProgressDashboard';
import { TaskView } from './components/TaskView';
import { useProgress } from './hooks/useProgress';
import { useUnitData } from './hooks/useUnitData';
import { requestFeedback } from './utils/feedbackService';

type View = 'overview' | 'dashboard' | 'task';

function App() {
  const [currentView, setCurrentView] = useState<View>('overview');
  const { unitData, loading, error } = useUnitData();
  const {
    progress,
    updateAnswer,
    markTaskComplete,
    markAsGoodEnough,
    addFeedback,
    setCurrentTask,
    getVelocityMetrics,
    getNextTask
  } = useProgress(unitData?.id);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading unit data...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !unitData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Failed to Load Unit Data</h1>
          <p className="text-gray-600 mb-4">
            {error || 'Unit data could not be loaded. Please check that unit-1.json exists in the public folder.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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

  const handleRequestFeedback = async () => {
    const task = getCurrentTask();
    const answer = getCurrentAnswer();
    
    if (task && answer) {
      try {
        const feedbackResponse = await requestFeedback({
          unitId: unitData.id,
          outcomeTaskId: task.id,
          answerText: answer.content,
          feedbackType: 'evaluate'
        });
        
        const formattedFeedback = `${feedbackResponse.feedbackMessage}\n\nLevel: ${feedbackResponse.level}\nScore: ${Math.round(feedbackResponse.score * 100)}%`;
        addFeedback(progress.currentTask, formattedFeedback);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to get feedback';
        addFeedback(progress.currentTask, `Error: ${errorMessage}`);
      }
    }
  };

  const handleMarkComplete = () => {
    markAsGoodEnough(progress.currentTask, true);
    markTaskComplete(progress.currentTask);
  };

  const handleNavigateNext = () => {
    const nextTask = getNextTask(unitData.learning_outcomes);
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
            unit={unitData}
            progress={progress}
            metrics={getVelocityMetrics(unitData.learning_outcomes.reduce((sum, lo) => sum + lo.outcome_tasks.length, 0))}
            onTaskSelect={handleTaskSelect}
          />
        );
      
      case 'task':
        const lo = getCurrentLO();
        const task = getCurrentTask();
        const answer = getCurrentAnswer();
        const nextTask = getNextTask(unitData.learning_outcomes);
        const totalTasks = unitData.learning_outcomes.reduce((sum, lo) => sum + lo.outcome_tasks.length, 0);
        const metrics = getVelocityMetrics(totalTasks);
        
        // Calculate current task number
        const allTasks = unitData.learning_outcomes.flatMap(lo => 
          lo.outcome_tasks.map(task => ({ loId: lo.id, taskId: task.id }))
        );
        const currentTaskNumber = allTasks.findIndex(t => t.taskId === progress.currentTask) + 1;
        
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
            totalTasks={totalTasks}
            completedTasks={metrics.completedTasks}
            currentTaskNumber={currentTaskNumber}
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