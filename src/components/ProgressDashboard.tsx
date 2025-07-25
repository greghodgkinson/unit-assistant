import React from 'react';
import { BookOpen, CheckCircle, Clock, TrendingUp, Target, Lightbulb } from 'lucide-react';
import { Progress, VelocityMetrics, Unit } from '../types/Unit';

interface ProgressDashboardProps {
  unit: Unit;
  progress: Progress;
  metrics: VelocityMetrics;
  onTaskSelect: (loId: string, taskId: string) => void;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({
  unit,
  progress,
  metrics,
  onTaskSelect
}) => {
  const totalTasks = unit.learning_outcomes.reduce((sum, lo) => sum + lo.outcome_tasks.length, 0);
  const completionRate = (metrics.completedTasks / totalTasks) * 100;

  const getTaskStatus = (taskId: string) => {
    const answer = progress.answers.find(a => a.taskId === taskId);
    if (!answer) return 'not-started';
    if (answer.isGoodEnough) return 'completed';
    return 'in-progress';
  };

  const getTaskTypeColor = (type: string) => {
    switch (type) {
      case 'standard': return 'bg-blue-100 text-blue-800';
      case 'merit': return 'bg-gray-100 text-gray-700';
      case 'distinction': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'border-green-300 bg-green-50';
      case 'in-progress': return 'border-yellow-300 bg-yellow-50';
      case 'not-started': return 'border-gray-200 bg-white';
      default: return 'border-gray-200 bg-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{totalTasks}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.completedTasks}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalAnswers - metrics.completedTasks}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Progress</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(completionRate)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Overall Progress</h3>
          <span className="text-sm text-gray-600">{metrics.completedTasks} of {totalTasks} tasks</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${completionRate}%` }}
          ></div>
        </div>
      </div>

      {/* Learning Outcomes */}
      <div className="space-y-6">
        {unit.learning_outcomes.map((lo) => (
          <div key={lo.id} className="bg-white rounded-xl shadow-sm border p-6">
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <Lightbulb className="h-6 w-6 text-yellow-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">{lo.id}</h3>
              </div>
              <p className="text-gray-600 mt-1">{lo.description}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lo.outcome_tasks.map((task) => {
                const status = getTaskStatus(task.id);
                const isCurrent = progress.currentTask === task.id;
                
                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                      getStatusColor(status)
                    } ${isCurrent ? 'ring-2 ring-blue-500' : ''}`}
                    onClick={() => onTaskSelect(lo.id, task.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center">
                        <Target className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="font-medium text-gray-900">{task.id}</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTaskTypeColor(task.type)}`}>
                        {task.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                        {status === 'in-progress' && <Clock className="h-4 w-4 text-yellow-600" />}
                        <span className="ml-1 text-xs text-gray-500 capitalize">{status.replace('-', ' ')}</span>
                      </div>
                      {isCurrent && <span className="text-xs font-medium text-blue-600">Current</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};