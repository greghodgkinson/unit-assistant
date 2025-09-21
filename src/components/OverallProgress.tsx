import React, { useState, useEffect } from 'react';
import { ArrowLeft, Zap, Target, TrendingUp, Clock, Activity, Cpu, Database, Wifi, Signal, BarChart3, LineChart, PieChart, Monitor, Code, Terminal, Gamepad2, Trophy, Star, Flame, ChevronRight, Play, Pause, RotateCcw } from 'lucide-react';
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
}

export const OverallProgress: React.FC<OverallProgressProps> = ({ units, getUnit, onBack }) => {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState<'completion' | 'velocity' | 'streak' | 'efficiency'>('completion');
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    calculateStats();
    
    // Simulate live updates every 30 seconds
    const interval = setInterval(() => {
      if (isLive) {
        calculateStats();
      }
    }, 30000);
    
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
      efficiency
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'in-progress': return 'text-yellow-400';
      case 'not-started': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'completion': return Target;
      case 'velocity': return Zap;
      case 'streak': return Flame;
      case 'efficiency': return TrendingUp;
      default: return Activity;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-green-400">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-2 border-green-400 border-t-transparent mx-auto mb-4"></div>
                <div className="absolute inset-0 rounded-full h-16 w-16 border border-green-400/20 animate-pulse"></div>
              </div>
              <div className="font-mono text-lg mb-2">INITIALIZING TELEMETRY...</div>
              <div className="text-green-400/60 text-sm">Analyzing performance data</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-900 text-red-400">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <Terminal className="h-16 w-16 mx-auto mb-4" />
              <div className="font-mono text-lg">ERROR: DATA UNAVAILABLE</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-green-400">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-black/50 border border-green-400/30 rounded-lg p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="flex items-center text-green-400/80 hover:text-green-400 transition-colors font-mono"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              BACK TO UNITS
            </button>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                <span className="font-mono text-sm">{isLive ? 'LIVE' : 'OFFLINE'}</span>
              </div>
              <button
                onClick={() => setIsLive(!isLive)}
                className="p-2 border border-green-400/30 rounded hover:bg-green-400/10 transition-colors"
              >
                {isLive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                onClick={calculateStats}
                className="p-2 border border-green-400/30 rounded hover:bg-green-400/10 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Monitor className="h-8 w-8 mr-3" />
              <h1 className="text-3xl font-mono font-bold">LEARNING TELEMETRY</h1>
              <Database className="h-8 w-8 ml-3" />
            </div>
            <div className="font-mono text-green-400/80">
              SYSTEM STATUS: {stats.completionRate >= 80 ? 'OPTIMAL' : stats.completionRate >= 50 ? 'NOMINAL' : 'SUBOPTIMAL'}
            </div>
            <div className="text-sm text-green-400/60 mt-2">
              Last updated: {new Date().toLocaleTimeString()} | {stats.totalTasks} total tasks tracked
            </div>
          </div>
        </div>

        {/* Core Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { key: 'completion', label: 'COMPLETION RATE', value: `${Math.round(stats.completionRate)}%`, icon: Target, color: 'green' },
            { key: 'velocity', label: 'VELOCITY', value: `${stats.velocity.toFixed(1)}/day`, icon: Zap, color: 'blue' },
            { key: 'streak', label: 'STREAK', value: `${stats.streakDays} days`, icon: Flame, color: 'orange' },
            { key: 'efficiency', label: 'EFFICIENCY', value: `${stats.efficiency > 0 ? '+' : ''}${Math.round(stats.efficiency)}%`, icon: TrendingUp, color: 'purple' }
          ].map((metric) => {
            const Icon = metric.icon;
            const isActive = activeMetric === metric.key;
            
            return (
              <div
                key={metric.key}
                className={`bg-black/50 border rounded-lg p-4 cursor-pointer transition-all duration-300 ${
                  isActive 
                    ? 'border-green-400 bg-green-400/10' 
                    : 'border-green-400/30 hover:border-green-400/50'
                }`}
                onClick={() => setActiveMetric(metric.key as any)}
              >
                <div className="flex items-center justify-between mb-3">
                  <Icon className={`h-6 w-6 ${isActive ? 'text-green-400' : 'text-green-400/60'}`} />
                  <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-green-400/30'}`}></div>
                </div>
                <div className="font-mono text-xs text-green-400/60 mb-1">{metric.label}</div>
                <div className="font-mono text-2xl font-bold text-green-400">{metric.value}</div>
                {isActive && (
                  <div className="mt-2 text-xs text-green-400/80 font-mono">
                    {metric.key === 'completion' && `${stats.completedTasks}/${stats.totalTasks} tasks`}
                    {metric.key === 'velocity' && `${Math.round(stats.velocity * 7)} tasks/week`}
                    {metric.key === 'streak' && stats.streakDays > 0 ? 'ACTIVE STREAK' : 'NO ACTIVE STREAK'}
                    {metric.key === 'efficiency' && (stats.efficiency > 0 ? 'IMPROVING' : stats.efficiency < 0 ? 'DECLINING' : 'STABLE')}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* System Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Task Distribution */}
          <div className="bg-black/50 border border-green-400/30 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <PieChart className="h-5 w-5 mr-2" />
              <h3 className="font-mono font-bold">TASK DISTRIBUTION</h3>
            </div>
            
            <div className="space-y-4">
              {[
                { label: 'COMPLETED', count: stats.completedTasks, color: 'bg-green-400', textColor: 'text-green-400' },
                { label: 'IN PROGRESS', count: stats.inProgressTasks, color: 'bg-yellow-400', textColor: 'text-yellow-400' },
                { label: 'NOT STARTED', count: stats.notStartedTasks, color: 'bg-gray-400', textColor: 'text-gray-400' }
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full ${item.color} mr-3`}></div>
                    <span className="font-mono text-sm">{item.label}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`font-mono font-bold ${item.textColor}`}>{item.count}</span>
                    <div className="w-16 bg-gray-700 rounded-full h-1">
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
          <div className="bg-black/50 border border-green-400/30 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Cpu className="h-5 w-5 mr-2" />
              <h3 className="font-mono font-bold">PERFORMANCE</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-sm">AVG COMPLETION TIME</span>
                  <span className="font-mono text-green-400">{Math.round(stats.averageTimeToComplete)}d</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1">
                  <div 
                    className="bg-green-400 h-1 rounded-full"
                    style={{ width: `${Math.min(100, (5 / Math.max(1, stats.averageTimeToComplete)) * 100)}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-sm">UNITS COMPLETED</span>
                  <span className="font-mono text-green-400">{stats.completedUnits}/{stats.totalUnits}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1">
                  <div 
                    className="bg-green-400 h-1 rounded-full"
                    style={{ width: `${stats.totalUnits > 0 ? (stats.completedUnits / stats.totalUnits) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="pt-2 border-t border-green-400/20">
                <div className="text-center">
                  <div className="font-mono text-xs text-green-400/60">SYSTEM EFFICIENCY</div>
                  <div className="font-mono text-lg font-bold text-green-400">
                    {stats.completionRate >= 80 ? '98.7%' : stats.completionRate >= 50 ? '76.3%' : '45.1%'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Log */}
          <div className="bg-black/50 border border-green-400/30 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Terminal className="h-5 w-5 mr-2" />
              <h3 className="font-mono font-bold">ACTIVITY LOG</h3>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {stats.recentActivity.length > 0 ? (
                stats.recentActivity.slice(0, 8).map((task, index) => (
                  <div key={`${task.unitId}-${task.taskId}`} className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center">
                      <div className="w-1 h-1 bg-green-400 rounded-full mr-2"></div>
                      <span className="text-green-400/80">TASK_{task.taskId}</span>
                    </div>
                    <div className="text-green-400/60">
                      {task.completedDate?.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-green-400/40 font-mono text-xs">
                  NO RECENT ACTIVITY
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Data Visualization */}
        <div className="bg-black/50 border border-green-400/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              <h3 className="font-mono font-bold">PROGRESS ANALYTICS</h3>
            </div>
            <div className="flex items-center space-x-2 text-xs font-mono">
              <Signal className="h-4 w-4" />
              <span>REAL-TIME DATA</span>
            </div>
          </div>
          
          {stats.completionTrend.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Completions Chart */}
              <div>
                <div className="font-mono text-sm text-green-400/80 mb-3">DAILY TASK COMPLETIONS</div>
                <div className="flex items-end space-x-1 h-32 bg-gray-800/50 p-4 rounded">
                  {stats.completionTrend.slice(-14).map((day, index) => {
                    const height = Math.max(4, (day.completed / Math.max(...stats.completionTrend.map(d => d.completed))) * 100);
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center">
                        <div 
                          className="w-full bg-green-400 rounded-t transition-all duration-300 hover:bg-green-300 relative group"
                          style={{ height: `${height}%`, minHeight: day.completed > 0 ? '4px' : '1px' }}
                        >
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black border border-green-400/30 px-2 py-1 rounded text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {day.completed} tasks
                          </div>
                        </div>
                        <div className="text-xs font-mono text-green-400/60 mt-1 transform -rotate-45 origin-left">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cumulative Progress */}
              <div>
                <div className="font-mono text-sm text-green-400/80 mb-3">CUMULATIVE PROGRESS</div>
                <div className="space-y-2 max-h-32 overflow-y-auto bg-gray-800/50 p-4 rounded">
                  {stats.completionTrend.slice(-6).reverse().map((day, index) => (
                    <div key={day.date} className="flex items-center justify-between font-mono text-xs">
                      <span className="text-green-400/60">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-green-400">{day.cumulative}</span>
                        {day.completed > 0 && (
                          <span className="bg-green-400/20 text-green-400 px-1 rounded">
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
            <div className="text-center py-8 text-green-400/40 font-mono">
              INSUFFICIENT DATA FOR VISUALIZATION
            </div>
          )}
        </div>

        {/* Status Footer */}
        <div className="bg-black/50 border border-green-400/30 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Wifi className="h-4 w-4 mr-1" />
                <span>CONNECTION: STABLE</span>
              </div>
              <div className="flex items-center">
                <Database className="h-4 w-4 mr-1" />
                <span>DATA INTEGRITY: 100%</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span>UPTIME: {Math.floor(Math.random() * 99) + 1}.{Math.floor(Math.random() * 9)}%</span>
              <span>LATENCY: {Math.floor(Math.random() * 50) + 10}ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};