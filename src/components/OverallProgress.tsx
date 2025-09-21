import React, { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, Calendar, Award, Target, Clock, Zap, Star, Trophy, CheckCircle2, BarChart3, Activity, Sparkles } from 'lucide-react';
import { UnitSummary } from '../types/Unit';

interface OverallProgressProps {
  units: UnitSummary[];
  getUnit: (unitId: string) => any;
  onBack: () => void;
}

interface TaskAnalytics {
  taskId: string;
  unitId: string;
  unitTitle: string;
  status: 'not-started' | 'in-progress' | 'completed';
  completedDate?: Date;
  timeToComplete?: number; // days
  submissionDate?: Date;
  lastModified?: Date;
  version: number;
  hasStatusHistory: boolean;
}

interface ProgressStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  notStartedTasks: number;
  completionRate: number;
  averageTimeToComplete: number;
  totalUnits: number;
  completedUnits: number;
  streakDays: number;
  recentActivity: TaskAnalytics[];
  completionTrend: { date: string; completed: number; cumulative: number }[];
  weeklyProgress: { week: string; completed: number }[];
}

export const OverallProgress: React.FC<OverallProgressProps> = ({ units, getUnit, onBack }) => {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'all'>('month');

  useEffect(() => {
    calculateStats();
  }, [units]);

  const calculateStats = () => {
    setLoading(true);
    
    const allTasks: TaskAnalytics[] = [];
    let totalUnitsCompleted = 0;

    // Collect all tasks from all units
    units.forEach(unitSummary => {
      const unit = getUnit(unitSummary.id);
      if (!unit) return;

      const progressKey = `learning-assistant-progress-${unitSummary.id}`;
      const progressData = localStorage.getItem(progressKey);
      const progress = progressData ? JSON.parse(progressData) : null;

      // Check if unit is completed
      if (unitSummary.completedTasks === unitSummary.totalTasks && unitSummary.totalTasks > 0) {
        totalUnitsCompleted++;
      }

      // Get unique tasks from this unit
      const uniqueTasks = new Set<string>();
      unit.learning_outcomes.forEach((lo: any) => {
        lo.outcome_tasks.forEach((task: any) => {
          if (!uniqueTasks.has(task.id)) {
            uniqueTasks.add(task.id);
            
            const answer = progress?.answers?.find((a: any) => a.taskId === task.id);
            let status: 'not-started' | 'in-progress' | 'completed' = 'not-started';
            let completedDate: Date | undefined;
            let timeToComplete: number | undefined;

            if (answer) {
              status = answer.isGoodEnough ? 'completed' : 'in-progress';
              
              // Try to get completion date from status history first
              if (answer.statusHistory && answer.statusHistory.length > 0) {
                const completionChange = answer.statusHistory
                  .reverse()
                  .find((change: any) => change.status === 'completed');
                
                if (completionChange) {
                  completedDate = new Date(completionChange.timestamp);
                }
              }
              
              // Fallback: if no status history but task is completed, use submission date
              if (!completedDate && answer.isGoodEnough && answer.submissionDate) {
                completedDate = new Date(answer.submissionDate);
              }

              // Calculate time to complete if we have a completion date
              if (completedDate && answer.submissionDate) {
                const startDate = new Date(answer.submissionDate);
                const endDate = completedDate;
                timeToComplete = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
              }
            }

            allTasks.push({
              taskId: task.id,
              unitId: unitSummary.id,
              unitTitle: unitSummary.title,
              status,
              completedDate,
              timeToComplete,
              submissionDate: answer?.submissionDate ? new Date(answer.submissionDate) : undefined,
              lastModified: answer?.lastModified ? new Date(answer.lastModified) : undefined,
              version: answer?.version || 0,
              hasStatusHistory: answer?.statusHistory && answer.statusHistory.length > 0
            });
          }
        });
      });
    });

    // Calculate basic stats
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = allTasks.filter(t => t.status === 'in-progress').length;
    const notStartedTasks = allTasks.filter(t => t.status === 'not-started').length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Calculate average time to complete
    const completedTasksWithTime = allTasks.filter(t => t.status === 'completed' && t.timeToComplete);
    const averageTimeToComplete = completedTasksWithTime.length > 0 
      ? completedTasksWithTime.reduce((sum, t) => sum + (t.timeToComplete || 0), 0) / completedTasksWithTime.length
      : 0;

    // Calculate streak (consecutive days with activity)
    const streakDays = calculateStreak(allTasks);

    // Get recent activity (last 10 completed tasks)
    const recentActivity = allTasks
      .filter(t => t.status === 'completed' && t.completedDate)
      .sort((a, b) => (b.completedDate?.getTime() || 0) - (a.completedDate?.getTime() || 0))
      .slice(0, 10);

    // Calculate completion trend
    const completionTrend = calculateCompletionTrend(allTasks);

    // Calculate weekly progress
    const weeklyProgress = calculateWeeklyProgress(allTasks);

    setStats({
      totalTasks,
      completedTasks,
      inProgressTasks,
      notStartedTasks,
      completionRate,
      averageTimeToComplete,
      totalUnits: units.length,
      completedUnits: totalUnitsCompleted,
      streakDays,
      recentActivity,
      completionTrend,
      weeklyProgress
    });

    setLoading(false);
  };

  const calculateStreak = (tasks: TaskAnalytics[]): number => {
    const completedTasks = tasks
      .filter(t => t.status === 'completed' && t.completedDate)
      .sort((a, b) => (b.completedDate?.getTime() || 0) - (a.completedDate?.getTime() || 0));

    if (completedTasks.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // Check if there's activity today or yesterday to start the streak
    const hasRecentActivity = completedTasks.some(task => {
      const taskDate = new Date(task.completedDate!);
      taskDate.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((currentDate.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff <= 1;
    });

    if (!hasRecentActivity) return 0;

    // Count consecutive days with activity
    for (let i = 0; i < 30; i++) { // Check last 30 days max
      const checkDate = new Date(currentDate);
      checkDate.setDate(checkDate.getDate() - i);
      
      const hasActivityOnDate = completedTasks.some(task => {
        const taskDate = new Date(task.completedDate!);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === checkDate.getTime();
      });

      if (hasActivityOnDate) {
        streak++;
      } else if (i > 0) { // Allow for today to have no activity if checking from yesterday
        break;
      }
    }

    return streak;
  };

  const calculateCompletionTrend = (tasks: TaskAnalytics[]) => {
    const completedTasks = tasks
      .filter(t => t.status === 'completed' && t.completedDate)
      .sort((a, b) => (a.completedDate?.getTime() || 0) - (b.completedDate?.getTime() || 0));

    const trend: { date: string; completed: number; cumulative: number }[] = [];
    const dailyCompletions = new Map<string, number>();

    // Group by date
    completedTasks.forEach(task => {
      const dateStr = task.completedDate!.toISOString().split('T')[0];
      dailyCompletions.set(dateStr, (dailyCompletions.get(dateStr) || 0) + 1);
    });

    // Create trend data
    let cumulative = 0;
    const sortedDates = Array.from(dailyCompletions.keys()).sort();
    
    sortedDates.forEach(date => {
      const completed = dailyCompletions.get(date) || 0;
      cumulative += completed;
      trend.push({
        date,
        completed,
        cumulative
      });
    });

    return trend.slice(-30); // Last 30 data points
  };

  const calculateWeeklyProgress = (tasks: TaskAnalytics[]) => {
    const completedTasks = tasks.filter(t => t.status === 'completed' && t.completedDate);
    const weeklyData = new Map<string, number>();

    completedTasks.forEach(task => {
      const date = new Date(task.completedDate!);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0];
      
      weeklyData.set(weekKey, (weeklyData.get(weekKey) || 0) + 1);
    });

    return Array.from(weeklyData.entries())
      .map(([week, completed]) => ({ week, completed }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-8); // Last 8 weeks
  };

  const getEncouragingMessage = (stats: ProgressStats) => {
    if (stats.completionRate >= 90) {
      return "🎉 Outstanding! You're absolutely crushing your learning goals!";
    } else if (stats.completionRate >= 70) {
      return "🌟 Fantastic progress! You're well on your way to mastery!";
    } else if (stats.completionRate >= 50) {
      return "💪 Great momentum! You're making solid progress every day!";
    } else if (stats.completionRate >= 25) {
      return "🚀 You're building great habits! Keep up the excellent work!";
    } else if (stats.completedTasks > 0) {
      return "✨ Every expert was once a beginner! You're on the right path!";
    } else {
      return "🌱 Ready to start your learning journey? Every great achievement begins with a single step!";
    }
  };

  const getStreakMessage = (streak: number) => {
    if (streak >= 30) return "🔥 Incredible! 30+ day streak!";
    if (streak >= 14) return "⚡ Amazing! 2+ week streak!";
    if (streak >= 7) return "💫 Fantastic! 1+ week streak!";
    if (streak >= 3) return "🌟 Great! Multi-day streak!";
    if (streak >= 1) return "✨ Nice! Keep it going!";
    return "🌱 Ready to start a streak?";
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mr-4"></div>
            <span className="text-gray-600">Analyzing your amazing progress...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
          <p className="text-gray-600">Unable to load progress data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white rounded-xl p-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Units
          </button>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="h-12 w-12 text-yellow-300 mr-4" />
            <h1 className="text-4xl font-bold">Your Learning Journey</h1>
            <Trophy className="h-12 w-12 text-yellow-300 ml-4" />
          </div>
          <p className="text-xl text-blue-100 mb-4">{getEncouragingMessage(stats)}</p>
          <div className="flex items-center justify-center space-x-8 text-lg">
            <div className="flex items-center">
              <Target className="h-6 w-6 mr-2" />
              <span>{stats.completedTasks} tasks completed</span>
            </div>
            <div className="flex items-center">
              <Award className="h-6 w-6 mr-2" />
              <span>{Math.round(stats.completionRate)}% progress</span>
            </div>
            <div className="flex items-center">
              <Zap className="h-6 w-6 mr-2" />
              <span>{getStreakMessage(stats.streakDays)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-6 rounded-xl border border-green-200">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
            <span className="text-2xl">🎯</span>
          </div>
          <div className="text-3xl font-bold text-green-800 mb-1">{stats.completedTasks}</div>
          <div className="text-sm text-green-600 font-medium">Tasks Completed</div>
          <div className="text-xs text-green-500 mt-1">
            {stats.totalTasks > 0 && `${Math.round((stats.completedTasks / stats.totalTasks) * 100)}% of all tasks`}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-100 p-6 rounded-xl border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <Activity className="h-8 w-8 text-blue-600" />
            <span className="text-2xl">⚡</span>
          </div>
          <div className="text-3xl font-bold text-blue-800 mb-1">{stats.streakDays}</div>
          <div className="text-sm text-blue-600 font-medium">Day Streak</div>
          <div className="text-xs text-blue-500 mt-1">
            {stats.streakDays > 0 ? 'Keep the momentum going!' : 'Start your streak today!'}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-violet-100 p-6 rounded-xl border border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <Clock className="h-8 w-8 text-purple-600" />
            <span className="text-2xl">⏱️</span>
          </div>
          <div className="text-3xl font-bold text-purple-800 mb-1">
            {stats.averageTimeToComplete > 0 ? Math.round(stats.averageTimeToComplete) : '-'}
          </div>
          <div className="text-sm text-purple-600 font-medium">Avg Days to Complete</div>
          <div className="text-xs text-purple-500 mt-1">
            {stats.averageTimeToComplete > 0 ? 'Great pace!' : 'Complete tasks to see stats'}
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-amber-100 p-6 rounded-xl border border-orange-200">
          <div className="flex items-center justify-between mb-4">
            <Award className="h-8 w-8 text-orange-600" />
            <span className="text-2xl">🏆</span>
          </div>
          <div className="text-3xl font-bold text-orange-800 mb-1">{stats.completedUnits}</div>
          <div className="text-sm text-orange-600 font-medium">Units Completed</div>
          <div className="text-xs text-orange-500 mt-1">
            {stats.totalUnits > 0 && `${Math.round((stats.completedUnits / stats.totalUnits) * 100)}% of all units`}
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overall Progress */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center mb-6">
            <BarChart3 className="h-6 w-6 text-blue-600 mr-3" />
            <h3 className="text-xl font-semibold text-gray-900">Overall Progress</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Completed Tasks</span>
                <span className="text-sm text-gray-600">{stats.completedTasks} / {stats.totalTasks}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${stats.completionRate}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-800">{stats.completedTasks}</div>
                <div className="text-xs text-green-600">Completed</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-lg font-bold text-yellow-800">{stats.inProgressTasks}</div>
                <div className="text-xs text-yellow-600">In Progress</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-gray-800">{stats.notStartedTasks}</div>
                <div className="text-xs text-gray-600">Not Started</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center mb-6">
            <Star className="h-6 w-6 text-yellow-600 mr-3" />
            <h3 className="text-xl font-semibold text-gray-900">Recent Achievements</h3>
          </div>
          
          {stats.recentActivity.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {stats.recentActivity.map((task, index) => (
                <div key={`${task.unitId}-${task.taskId}`} className="flex items-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex-shrink-0 mr-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      Task {task.taskId}
                    </div>
                    <div className="text-xs text-gray-600 truncate">
                      {task.unitTitle}
                    </div>
                    <div className="text-xs text-green-600">
                      {task.completedDate?.toLocaleDateString()} 
                      {task.timeToComplete && ` • ${task.timeToComplete} day${task.timeToComplete !== 1 ? 's' : ''}`}
                    </div>
                  </div>
                  {index < 3 && (
                    <div className="flex-shrink-0">
                      <span className="text-lg">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Star className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p>Complete your first task to see achievements here!</p>
            </div>
          )}
        </div>
      </div>

      {/* Completion Trend */}
      {stats.completionTrend.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <TrendingUp className="h-6 w-6 text-blue-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Progress Trend</h3>
            </div>
            <div className="text-sm text-gray-600">
              Last {stats.completionTrend.length} days with activity
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Simple trend visualization */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Daily Completions</h4>
              <div className="flex items-end space-x-1 h-32">
                {stats.completionTrend.slice(-14).map((day, index) => (
                  <div key={day.date} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                      style={{ 
                        height: `${Math.max(8, (day.completed / Math.max(...stats.completionTrend.map(d => d.completed))) * 100)}%`,
                        minHeight: day.completed > 0 ? '8px' : '2px'
                      }}
                      title={`${day.completed} tasks on ${new Date(day.date).toLocaleDateString()}`}
                    ></div>
                    <div className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-left">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cumulative progress */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Cumulative Progress</h4>
              <div className="space-y-2">
                {stats.completionTrend.slice(-5).reverse().map((day) => (
                  <div key={day.date} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">
                      {new Date(day.date).toLocaleDateString()}
                    </span>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900 mr-2">
                        {day.cumulative} total
                      </span>
                      {day.completed > 0 && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          +{day.completed}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Motivational Footer */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-8 text-center">
        <div className="flex items-center justify-center mb-4">
          <Sparkles className="h-8 w-8 text-purple-600 mr-3" />
          <h3 className="text-2xl font-bold text-gray-900">Keep Going!</h3>
          <Sparkles className="h-8 w-8 text-purple-600 ml-3" />
        </div>
        <p className="text-lg text-gray-700 mb-4">
          {stats.completedTasks > 0 
            ? `You've completed ${stats.completedTasks} task${stats.completedTasks !== 1 ? 's' : ''} - that's incredible progress! 🌟`
            : "Your learning journey is about to begin - every expert was once a beginner! 🚀"
          }
        </p>
        <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            <span>Tracking since {units.length > 0 ? 'you started' : 'today'}</span>
          </div>
          <div className="flex items-center">
            <Target className="h-4 w-4 mr-1" />
            <span>{stats.totalTasks} total tasks to master</span>
          </div>
          <div className="flex items-center">
            <Trophy className="h-4 w-4 mr-1" />
            <span>{stats.totalUnits} units to complete</span>
          </div>
        </div>
      </div>
    </div>
  );
};