import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface WorkingPeriod {
  id: string;
  startTime: string;
  endTime: string;
}

interface WorkingHours {
  [key: string]: WorkingPeriod[];
}

export const WorkingTimeIndicator: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [workingHours, setWorkingHours] = useState<WorkingHours>({});
  const [isVisible, setIsVisible] = useState(true);

  const WORKING_HOURS_STORAGE_KEY = 'learning-assistant-working-hours';
  const VISIBILITY_STORAGE_KEY = 'learning-assistant-working-time-visible';

  const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  useEffect(() => {
    // Load working hours from localStorage
    const savedWorkingHours = localStorage.getItem(WORKING_HOURS_STORAGE_KEY);
    if (savedWorkingHours) {
      setWorkingHours(JSON.parse(savedWorkingHours));
    }

    // Load visibility preference
    const savedVisibility = localStorage.getItem(VISIBILITY_STORAGE_KEY);
    if (savedVisibility !== null) {
      setIsVisible(JSON.parse(savedVisibility));
    }

    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const toggleVisibility = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(newVisibility));
  };

  const parseTime = (timeString: string): { hours: number; minutes: number } => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return { hours, minutes };
  };

  const timeToMinutes = (hours: number, minutes: number): number => {
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const getCurrentDayWorkingPeriods = (): WorkingPeriod[] => {
    const today = DAYS_OF_WEEK[currentTime.getDay()];
    return workingHours[today] || [];
  };

  const getCurrentWorkingTimeInfo = () => {
    const periods = getCurrentDayWorkingPeriods();
    
    if (periods.length === 0) {
      return {
        isWorkingDay: false,
        totalWorkingMinutes: 0,
        elapsedMinutes: 0,
        remainingMinutes: 0,
        minutesUntilEnd: 0,
        currentPeriodElapsed: 0,
        currentPeriodTotal: 0,
        currentPeriod: null,
        nextPeriod: null,
        isCurrentlyWorking: false,
        progressPercentage: 0,
        currentPeriodProgressPercentage: 0
      };
    }

    const currentMinutes = timeToMinutes(currentTime.getHours(), currentTime.getMinutes());
    
    // Calculate total working minutes for the day
    const totalWorkingMinutes = periods.reduce((total, period) => {
      const start = parseTime(period.startTime);
      const end = parseTime(period.endTime);
      const startMinutes = timeToMinutes(start.hours, start.minutes);
      const endMinutes = timeToMinutes(end.hours, end.minutes);
      return total + (endMinutes - startMinutes);
    }, 0);

    // Find current period and calculate elapsed/remaining time
    let elapsedMinutes = 0;
    let remainingMinutes = totalWorkingMinutes;
    let minutesUntilEnd = 0;
    let currentPeriodElapsed = 0;
    let currentPeriodTotal = 0;
    let currentPeriod: WorkingPeriod | null = null;
    let nextPeriod: WorkingPeriod | null = null;
    let isCurrentlyWorking = false;

    // Sort periods by start time
    const sortedPeriods = [...periods].sort((a, b) => {
      const aStart = parseTime(a.startTime);
      const bStart = parseTime(b.startTime);
      return timeToMinutes(aStart.hours, aStart.minutes) - timeToMinutes(bStart.hours, bStart.minutes);
    });

    for (let i = 0; i < sortedPeriods.length; i++) {
      const period = sortedPeriods[i];
      const start = parseTime(period.startTime);
      const end = parseTime(period.endTime);
      const startMinutes = timeToMinutes(start.hours, start.minutes);
      const endMinutes = timeToMinutes(end.hours, end.minutes);
      const periodDuration = endMinutes - startMinutes;

      if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
        // Currently in this working period
        currentPeriod = period;
        isCurrentlyWorking = true;
        const elapsedInCurrentPeriod = currentMinutes - startMinutes;
        currentPeriodElapsed = elapsedInCurrentPeriod;
        currentPeriodTotal = periodDuration;
        elapsedMinutes += elapsedInCurrentPeriod;
        remainingMinutes = totalWorkingMinutes - elapsedMinutes;
        minutesUntilEnd = endMinutes - currentMinutes;
        
        // Add remaining time from future periods
        for (let j = i + 1; j < sortedPeriods.length; j++) {
          const futurePeriod = sortedPeriods[j];
          const futureStart = parseTime(futurePeriod.startTime);
          const futureEnd = parseTime(futurePeriod.endTime);
          const futureStartMinutes = timeToMinutes(futureStart.hours, futureStart.minutes);
          const futureEndMinutes = timeToMinutes(futureEnd.hours, futureEnd.minutes);
          remainingMinutes += (futureEndMinutes - futureStartMinutes);
        }
        break;
      } else if (currentMinutes < startMinutes) {
        // Before this period starts
        if (!nextPeriod) {
          nextPeriod = period;
        }
        remainingMinutes = totalWorkingMinutes - elapsedMinutes;
        break;
      } else {
        // After this period has ended
        elapsedMinutes += periodDuration;
      }
    }

    // If we're past all working periods
    if (!currentPeriod && !nextPeriod && elapsedMinutes === totalWorkingMinutes) {
      remainingMinutes = 0;
    }

    const progressPercentage = totalWorkingMinutes > 0 ? (elapsedMinutes / totalWorkingMinutes) * 100 : 0;
    const currentPeriodProgressPercentage = currentPeriodTotal > 0 ? (currentPeriodElapsed / currentPeriodTotal) * 100 : 0;

    return {
      isWorkingDay: true,
      totalWorkingMinutes,
      elapsedMinutes,
      remainingMinutes,
      minutesUntilEnd,
      currentPeriodElapsed,
      currentPeriodTotal,
      currentPeriod,
      nextPeriod,
      isCurrentlyWorking,
      progressPercentage: Math.min(100, Math.max(0, progressPercentage)),
      currentPeriodProgressPercentage: Math.min(100, Math.max(0, currentPeriodProgressPercentage))
    };
  };

  const formatMinutes = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const getStatusColor = (info: ReturnType<typeof getCurrentWorkingTimeInfo>) => {
    if (!info.isWorkingDay) return 'bg-gray-100 text-gray-600';
    if (!info.isCurrentlyWorking) return 'bg-blue-100 text-blue-700';
    if (info.minutesUntilEnd <= 30) return 'bg-red-100 text-red-700';
    if (info.minutesUntilEnd <= 60) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  const workingTimeInfo = getCurrentWorkingTimeInfo();

  if (!isVisible) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={toggleVisibility}
          className="p-2 bg-white rounded-lg shadow-lg border hover:bg-gray-50 transition-colors"
          title="Show working time indicator"
        >
          <Clock className="h-4 w-4 text-gray-600" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="rounded-lg shadow-lg border p-4 min-w-64 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="font-medium text-sm text-gray-900">
              {!workingTimeInfo.isWorkingDay 
                ? 'Non-working day' 
                : workingTimeInfo.isCurrentlyWorking 
                  ? 'Working time' 
                  : 'Outside working hours'
              }
            </span>
          </div>
          <button
            onClick={toggleVisibility}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Hide working time indicator"
          >
            ×
          </button>
        </div>

        {workingTimeInfo.isWorkingDay && (
          <>
            {/* Daily Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-600">Daily Time Elapsed</span>
                <span className="text-xs text-gray-600">
                  {Math.round(workingTimeInfo.progressPercentage)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-300 bg-blue-500"
                  style={{ width: `${workingTimeInfo.progressPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Current Period Progress Bar */}
            {workingTimeInfo.isCurrentlyWorking && (
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600">Current Period</span>
                  <span className="text-xs text-gray-600">
                    {Math.round(workingTimeInfo.currentPeriodProgressPercentage)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300 bg-green-500"
                    style={{ width: `${workingTimeInfo.currentPeriodProgressPercentage}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Time Information */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Daily Elapsed:</span>
                <span className="font-medium">{formatMinutes(workingTimeInfo.elapsedMinutes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Daily Remaining:</span>
                <span className="font-medium">{formatMinutes(workingTimeInfo.remainingMinutes)}</span>
              </div>
              {workingTimeInfo.isCurrentlyWorking && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Period Elapsed:</span>
                  <span className="font-medium">{formatMinutes(workingTimeInfo.currentPeriodElapsed)}</span>
                </div>
              )}
              {workingTimeInfo.isCurrentlyWorking && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Until break:</span>
                  <span className="font-medium text-gray-900">
                    {formatMinutes(workingTimeInfo.minutesUntilEnd)}
                  </span>
                </div>
              )}
              {!workingTimeInfo.isCurrentlyWorking && workingTimeInfo.nextPeriod && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Next period:</span>
                  <span className="font-medium">{workingTimeInfo.nextPeriod.startTime}</span>
                </div>
              )}
            </div>

            {/* Current Time */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Current time:</span>
                <span className="text-xs font-mono">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </>
        )}

        {!workingTimeInfo.isWorkingDay && (
          <div className="text-center text-sm text-gray-600">
            <p>Enjoy your day off!</p>
          </div>
        )}
      </div>
    </div>
  );
};