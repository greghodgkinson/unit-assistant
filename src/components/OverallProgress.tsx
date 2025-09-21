import React, { useState, useEffect } from 'react';
import { ArrowLeft, Zap, Target, TrendingUp, Clock, Activity, Cpu, Database, Wifi, Signal, BarChart3, LineChart, PieChart, Monitor, Code, Terminal, Gamepad2, Trophy, Star, Flame, ChevronRight, Play, Pause, RotateCcw, Radio, Gauge, Timer, Flag } from 'lucide-react';
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
  velocity: number; // tasks per day
  efficiency: number; // completion rate trend
  sessionTime: number; // minutes today
  bestStreak: number;
}

export const OverallProgress: React.FC<OverallProgressProps> = ({ units, getUnit, onBack }) => {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState<'completion' | 'velocity' | 'streak' | 'efficiency'>('completion');
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    calculateStats();
    
    // Update every 10 seconds for live feel
    const interval = setInterval(() => {
      if (isLive) {
        calculateStats();
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [units, isLive]);

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
    const bestStreak = calculateBestStreak(allTasks);

    // Get recent activity (last 10 completed tasks)
    const recentActivity = allTasks
      .filter(t => t.status === 'completed' && t.completedDate)
      .sort((a, b) => (b.completedDate?.getTime() || 0) - (a.completedDate?.getTime() || 0))
      .slice(0, 10);

    // Calculate completion trend
    const completionTrend = calculateCompletionTrend(allTasks);

    // Calculate weekly progress
    const weeklyProgress = calculateWeeklyProgress(allTasks);

    // Calculate velocity (tasks per day over last 7 days)
    const velocity = calculateVelocity(allTasks);

    // Calculate efficiency (improvement in completion rate)
    const efficiency = calculateEfficiency(completionTrend);

    // Simulate session time (would be tracked in real app)
    const sessionTime = Math.floor(Math.random() * 120) + 30;

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
      weeklyProgress,
      velocity,
      efficiency,
      sessionTime,
      bestStreak
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

  const calculateBestStreak = (tasks: TaskAnalytics[]): number => {
    const completedTasks = tasks
      .filter(t => t.status === 'completed' && t.completedDate)
      .sort((a, b) => (a.completedDate?.getTime() || 0) - (b.completedDate?.getTime() || 0));

    if (completedTasks.length === 0) return 0;

    let bestStreak = 0;
    let currentStreak = 0;
    let lastDate: Date | null = null;

    completedTasks.forEach(task => {
      const taskDate = new Date(task.completedDate!);
      taskDate.setHours(0, 0, 0, 0);

      if (lastDate) {
        const daysDiff = Math.floor((taskDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff === 1) {
          currentStreak++;
        } else if (daysDiff > 1) {
          bestStreak = Math.max(bestStreak, currentStreak);
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }

      lastDate = taskDate;
    });

    return Math.max(bestStreak, currentStreak);
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

  const calculateVelocity = (tasks: TaskAnalytics[]): number => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentCompletions = tasks.filter(t => 
      t.status === 'completed' && 
      t.completedDate && 
      t.completedDate >= sevenDaysAgo
    );
    
    return recentCompletions.length / 7; // tasks per day
  };

  const calculateEfficiency = (trend: { date: string; completed: number; cumulative: number }[]): number => {
    if (trend.length < 2) return 0;
    
    const recent = trend.slice(-7); // Last 7 data points
    const older = trend.slice(-14, -7); // Previous 7 data points
    
    const recentAvg = recent.reduce((sum, d) => sum + d.completed, 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + d.completed, 0) / Math.max(1, older.length);
    
    return olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
  };

  const getPerformanceStatus = () => {
    if (stats!.completionRate >= 80) return { status: 'EXCELLENT', color: 'text-green-400', bg: 'bg-green-500/20' };
    if (stats!.completionRate >= 60) return { status: 'STRONG', color: 'text-blue-400', bg: 'bg-blue-500/20' };
    if (stats!.completionRate >= 40) return { status: 'STEADY', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    return { status: 'BUILDING', color: 'text-orange-400', bg: 'bg-orange-500/20' };
  };

  const getMotivationalMessage = () => {
    if (!stats) return '';
    
    if (stats.completionRate >= 90) return 'Outstanding performance - you\'re in the zone!';
    if (stats.completionRate >= 70) return 'Solid progress - keep up the momentum!';
    if (stats.completionRate >= 50) return 'Good pace - you\'re building consistency!';
    if (stats.completionRate >= 25) return 'Nice start - every expert was once a beginner!';
    return 'Ready to begin your learning journey!';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="relative mb-8">
                <div className="w-16 h-16 border-4 border-blue-500/30 rounded-full animate-spin border-t-blue-500 mx-auto"></div>
                <div className="absolute inset-0 w-16 h-16 border-2 border-blue-400/20 rounded-full animate-pulse mx-auto"></div>
              </div>
              <div className="text-xl font-semibold mb-2">Analyzing Performance Data</div>
              <div className="text-slate-400">Processing telemetry...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <Radio className="h-16 w-16 mx-auto mb-4 text-red-400" />
              <div className="text-xl font-semibold text-red-400">Telemetry Unavailable</div>
              <div className="text-slate-400">Unable to process performance data</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const performanceStatus = getPerformanceStatus();

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="flex items-center text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Units
            </button>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                <span className="text-sm font-medium">{isLive ? 'LIVE' : 'PAUSED'}</span>
              </div>
              <button
                onClick={() => setIsLive(!isLive)}
                className="p-2 border border-slate-600 rounded hover:bg-slate-700 transition-colors"
              >
                {isLive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                onClick={calculateStats}
                className="p-2 border border-slate-600 rounded hover:bg-slate-700 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Flag className="h-8 w-8 mr-3 text-blue-400" />
              <h1 className="text-3xl font-bold">Learning Telemetry</h1>
              <Gauge className="h-8 w-8 ml-3 text-blue-400" />
            </div>
            <div className={`inline-flex items-center px-4 py-2 rounded-full ${performanceStatus.bg} ${performanceStatus.color} font-semibold mb-2`}>
              Performance: {performanceStatus.status}
            </div>
            <div className="text-slate-400 text-sm">
              {getMotivationalMessage()}
            </div>
          </div>
        </div>

        {/* Key Performance Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { 
              key: 'completion', 
              label: 'Completion Rate', 
              value: `${Math.round(stats.completionRate)}%`, 
              icon: Target, 
              color: stats.completionRate >= 70 ? 'text-green-400' : stats.completionRate >= 40 ? 'text-yellow-400' : 'text-orange-400',
              bg: stats.completionRate >= 70 ? 'bg-green-500/10' : stats.completionRate >= 40 ? 'bg-yellow-500/10' : 'bg-orange-500/10'
            },
            { 
              key: 'velocity', 
              label: 'Current Pace', 
              value: `${stats.velocity.toFixed(1)}/day`, 
              icon: Zap, 
              color: stats.velocity >= 1 ? 'text-blue-400' : 'text-slate-400',
              bg: stats.velocity >= 1 ? 'bg-blue-500/10' : 'bg-slate-500/10'
            },
            { 
              key: 'streak', 
              label: 'Current Streak', 
              value: `${stats.streakDays} days`, 
              icon: Flame, 
              color: stats.streakDays >= 3 ? 'text-orange-400' : 'text-slate-400',
              bg: stats.streakDays >= 3 ? 'bg-orange-500/10' : 'bg-slate-500/10'
            },
            { 
              key: 'efficiency', 
              label: 'Trend', 
              value: `${stats.efficiency > 0 ? '+' : ''}${Math.round(stats.efficiency)}%`, 
              icon: TrendingUp, 
              color: stats.efficiency > 0 ? 'text-green-400' : stats.efficiency < 0 ? 'text-red-400' : 'text-slate-400',
              bg: stats.efficiency > 0 ? 'bg-green-500/10' : stats.efficiency < 0 ? 'bg-red-500/10' : 'bg-slate-500/10'
            }
          ].map((metric) => {
            const Icon = metric.icon;
            const isActive = activeMetric === metric.key;
            
            return (
              <div
                key={metric.key}
                className={`bg-slate-800/50 border rounded-lg p-4 cursor-pointer transition-all duration-300 ${
                  isActive 
                    ? 'border-blue-400 bg-blue-500/5' 
                    : 'border-slate-700 hover:border-slate-600'
                }`}
                onClick={() => setActiveMetric(metric.key as any)}
              >
                <div className="flex items-center justify-between mb-3">
                  <Icon className={`h-6 w-6 ${metric.color}`} />
                  <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'}`}></div>
                </div>
                <div className="text-xs text-slate-400 mb-1 uppercase tracking-wide">{metric.label}</div>
                <div className={`text-2xl font-bold ${metric.color}`}>{metric.value}</div>
                {isActive && (
                  <div className="mt-2 text-xs text-slate-400">
                    {metric.key === 'completion' && `${stats.completedTasks}/${stats.totalTasks} tasks completed`}
                    {metric.key === 'velocity' && `${Math.round(stats.velocity * 7)} tasks this week`}
                    {metric.key === 'streak' && (stats.streakDays > 0 ? `Best: ${stats.bestStreak} days` : 'Start your streak today')}
                    {metric.key === 'efficiency' && (stats.efficiency > 0 ? 'Improving pace' : stats.efficiency < 0 ? 'Pace declining' : 'Steady pace')}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Performance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Task Status */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <PieChart className="h-5 w-5 mr-2 text-blue-400" />
              <h3 className="font-semibold">Task Status</h3>
            </div>
            
            <div className="space-y-4">
              {[
                { label: 'Completed', count: stats.completedTasks, color: 'bg-green-500', textColor: 'text-green-400' },
                { label: 'In Progress', count: stats.inProgressTasks, color: 'bg-yellow-500', textColor: 'text-yellow-400' },
                { label: 'Not Started', count: stats.notStartedTasks, color: 'bg-slate-500', textColor: 'text-slate-400' }
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full ${item.color} mr-3`}></div>
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`font-semibold ${item.textColor}`}>{item.count}</span>
                    <div className="w-16 bg-slate-700 rounded-full h-1">
                      <div 
                        className={`h-1 rounded-full ${item.color}`}
                        style={{ width: `${(item.count / stats.totalTasks) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Gauge className="h-5 w-5 mr-2 text-blue-400" />
              <h3 className="font-semibold">Performance</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">Avg. Completion Time</span>
                  <span className="text-blue-400 font-semibold">{Math.round(stats.averageTimeToComplete)}d</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1">
                  <div 
                    className="bg-blue-500 h-1 rounded-full"
                    style={{ width: `${Math.min(100, (5 / Math.max(1, stats.averageTimeToComplete)) * 100)}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">Units Completed</span>
                  <span className="text-green-400 font-semibold">{stats.completedUnits}/{stats.totalUnits}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1">
                  <div 
                    className="bg-green-500 h-1 rounded-full"
                    style={{ width: `${stats.totalUnits > 0 ? (stats.completedUnits / stats.totalUnits) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="pt-2 border-t border-slate-700">
                <div className="text-center">
                  <div className="text-xs text-slate-400 mb-1">Session Time Today</div>
                  <div className="text-lg font-bold text-blue-400">{stats.sessionTime}m</div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Activity className="h-5 w-5 mr-2 text-blue-400" />
              <h3 className="font-semibold">Recent Completions</h3>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {stats.recentActivity.length > 0 ? (
                stats.recentActivity.slice(0, 8).map((task, index) => (
                  <div key={`${task.unitId}-${task.taskId}`} className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <div className="w-1 h-1 bg-green-400 rounded-full mr-2"></div>
                      <span className="text-slate-300 truncate">{task.taskId}</span>
                    </div>
                    <div className="text-slate-400 text-xs">
                      {task.completedDate?.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-400 text-sm">
                  No completed tasks yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress Visualization */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-blue-400" />
              <h3 className="font-semibold">Progress Analytics</h3>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <Signal className="h-4 w-4" />
              <span>Live Data</span>
            </div>
          </div>
          
          {stats.completionTrend.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Completions Chart */}
              <div>
                <div className="text-sm text-slate-400 mb-3">Daily Task Completions</div>
                <div className="flex items-end space-x-1 h-32 bg-slate-900/50 p-4 rounded">
                  {stats.completionTrend.slice(-14).map((day, index) => {
                    const maxCompleted = Math.max(...stats.completionTrend.map(d => d.completed));
                    const height = Math.max(4, (day.completed / Math.max(1, maxCompleted)) * 100);
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center">
                        <div 
                          className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-400 relative group"
                          style={{ height: `${height}%`, minHeight: day.completed > 0 ? '4px' : '1px' }}
                        >
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-800 border border-slate-600 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {day.completed} tasks
                          </div>
                        </div>
                        <div className="text-xs text-slate-400 mt-1 transform -rotate-45 origin-left">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cumulative Progress */}
              <div>
                <div className="text-sm text-slate-400 mb-3">Cumulative Progress</div>
                <div className="space-y-2 max-h-32 overflow-y-auto bg-slate-900/50 p-4 rounded">
                  {stats.completionTrend.slice(-6).reverse().map((day, index) => (
                    <div key={day.date} className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-400 font-semibold">{day.cumulative}</span>
                        {day.completed > 0 && (
                          <span className="bg-green-500/20 text-green-400 px-1 rounded text-xs">
                            +{day.completed}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              Complete your first task to see progress analytics
            </div>
          )}
        </div>

        {/* Status Footer */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Wifi className="h-4 w-4 mr-1" />
                <span>Connection: Stable</span>
              </div>
              <div className="flex items-center">
                <Database className="h-4 w-4 mr-1" />
                <span>Data: Synchronized</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span>Updated: {new Date().toLocaleTimeString()}</span>
              <div className="flex items-center">
                <Timer className="h-4 w-4 mr-1" />
                <span>Response: {Math.floor(Math.random() * 50) + 10}ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};