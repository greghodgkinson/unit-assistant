import React, { useState } from 'react';
import { UnitList } from './components/UnitList';
import { UnitUpload } from './components/UnitUpload';
import { LoadFromStorage } from './components/LoadFromStorage';
import { UnitOverview } from './components/UnitOverview';
import { ProgressDashboard } from './components/ProgressDashboard';
import { TaskView } from './components/TaskView';
import { useProgress } from './hooks/useProgress';
import { useUnitManager } from './hooks/useUnitManager';
import { requestFeedback } from './utils/feedbackService';
import { Unit } from './types/Unit';

type View = 'list' | 'upload' | 'load-storage' | 'overview' | 'dashboard' | 'task';

function App() {
  const [currentView, setCurrentView] = useState<View>('list');
  const [currentUnitId, setCurrentUnitId] = useState<string | null>(null);
  const { units, unitList, loading, error, addUnit, removeUnit, getUnit, updateUnitProgress } = useUnitManager();
  
  // Get unit data
  const unitData = currentUnitId ? getUnit(currentUnitId) : null;
  
  // Only initialize progress hook when we have both a current unit ID and the unit data is loaded
  const {
    progress,
    refreshProgress,
    updateAnswer,
    markTaskComplete,
    markAsGoodEnough,
    addFeedback,
    setCurrentTask,
    getVelocityMetrics,
    getNextTask
  } = useProgress(currentUnitId && unitData ? currentUnitId : '');

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
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Failed to Load Unit Data</h1>
          <p className="text-gray-600 mb-4">
            {error}
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

  const handleSelectUnit = (unitId: string) => {
    setCurrentUnitId(unitId);
    setCurrentView('overview');
  };

  const handleAddUnit = () => {
    setCurrentView('upload');
  };

  const handleLoadFromStorage = () => {
    setCurrentView('load-storage');
  };

  const handleUnitUploaded = (unit: Unit) => {
    addUnit(unit);
    setCurrentView('list');
  };

  const handleProgressLoaded = () => {
    setCurrentUnitId(null);
    setCurrentView('list');
    
    // Force a complete page reload to ensure all hooks reinitialize
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const getCurrentLO = () => {
    return unitData?.learning_outcomes.find(lo => lo.id === progress.currentLO);
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

  const handleBackToList = () => {
    setCurrentUnitId(null);
    setCurrentView('list');
  };

  const handleAnswerUpdate = (content: string) => {
    updateAnswer(progress.currentTask, content);
  };

  const handleRequestFeedback = async () => {
    const task = getCurrentTask();
    const answer = getCurrentAnswer();
    const lo = getCurrentLO();
    
    if (task && answer && lo) {
      console.log('Feedback request details:', {
        unitId: currentUnitId,
        taskId: task.id,
        answerLength: answer.content.length,
        taskDescription: task.description,
        acceptanceCriteriaCount: task.acceptance_criteria.length
      });
      
      try {
        const feedbackResponse = await requestFeedback({
          unitId: currentUnitId || '',
          outcomeTaskId: task.id,
          answerText: answer.content,
          feedbackType: 'evaluate',
          taskDetails: {
            description: task.description,
            type: task.type,
            acceptance_criteria: task.acceptance_criteria
          },
          learningOutcome: {
            id: lo.id,
            description: lo.description,
            indicative_content: lo.indicative_content
          }
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
    
    // Update unit progress in the manager
    if (currentUnitId) {
      updateUnitProgress(currentUnitId, progress.completedTasks.length + 1);
    }
  };

  const handleNavigateNext = () => {
    const nextTask = getNextTask(unitData?.learning_outcomes || []);
    if (nextTask) {
      setCurrentTask(nextTask.loId, nextTask.taskId);
    }
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'list':
        return (
          <UnitList
            units={unitList}
            onSelectUnit={handleSelectUnit}
            onAddUnit={handleAddUnit}
            onLoadFromStorage={handleLoadFromStorage}
            onRemoveUnit={removeUnit}
          />
        );
      
      case 'upload':
        return <UnitUpload onUnitUploaded={handleUnitUploaded} onBack={() => setCurrentView('list')} />;
      
      case 'load-storage':
        return <LoadFromStorage onProgressLoaded={handleProgressLoaded} onBack={() => setCurrentView('list')} />;
      
      case 'overview':
        return unitData ? (
          <UnitOverview
            unit={unitData}
            onStartLearning={() => setCurrentView('dashboard')}
          />
        ) : <div>Unit not found</div>;
      
      case 'dashboard':
        return unitData ? (
          <ProgressDashboard
            unit={unitData}
            progress={progress}
            metrics={getVelocityMetrics(unitData?.learning_outcomes.reduce((sum, lo) => sum + lo.outcome_tasks.length, 0) || 0)}
            onTaskSelect={handleTaskSelect}
          />
        ) : <div>Unit not found</div>;
      
      case 'task':
        if (!unitData) {
          return <div>Unit not found</div>;
        }
        
        const lo = getCurrentLO();
        const task = getCurrentTask();
        const answer = getCurrentAnswer();
        const nextTask = getNextTask(unitData?.learning_outcomes || []);
        const totalTasks = unitData.learning_outcomes.reduce((sum, lo) => sum + lo.outcome_tasks.length, 0);
        const metrics = getVelocityMetrics(totalTasks);
        
        // Calculate current task number
        const allTasks = (unitData?.learning_outcomes || []).flatMap(lo => 
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
            unitId={currentUnitId || ''}
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
              <button onClick={handleBackToList} className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                Learning Assistant
              </button>
              {currentView !== 'list' && currentView !== 'upload' && currentView !== 'overview' && unitData && (
                <span className="ml-4 text-sm text-gray-600">
                  {unitData.title}
                </span>
              )}
            </div>
            
            {currentView !== 'list' && currentView !== 'upload' && currentView !== 'overview' && (
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