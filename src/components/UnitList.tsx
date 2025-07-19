import React from 'react';
import { BookOpen, Plus, Calendar, CheckCircle, Clock, Trash2, Download, Save } from 'lucide-react';
import { UnitSummary } from '../types/Unit';
import { exportAllProgress, downloadProgressAsJson, saveProgressToStorage } from '../utils/storageExport';

interface UnitListProps {
  units: UnitSummary[];
  onSelectUnit: (unitId: string) => void;
  onAddUnit: () => void;
  onRemoveUnit: (unitId: string) => void;
}

export const UnitList: React.FC<UnitListProps> = ({
  units,
  onSelectUnit,
  onAddUnit,
  onRemoveUnit
}) => {
  const getProgressPercentage = (unit: UnitSummary) => {
    return unit.totalTasks > 0 ? Math.round((unit.completedTasks / unit.totalTasks) * 100) : 0;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage === 100) return 'bg-green-500';
    if (percentage >= 50) return 'bg-blue-500';
    if (percentage > 0) return 'bg-yellow-500';
    return 'bg-gray-300';
  };

  const handleRemoveUnit = (e: React.MouseEvent, unitId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to remove this unit? This will delete all progress data.')) {
      onRemoveUnit(unitId);
    }
  };

  const handleExportProgress = () => {
    downloadProgressAsJson();
  };

  const handleSaveToStorage = async () => {
    try {
      const exportData = exportAllProgress();
      await saveProgressToStorage(exportData);
      alert('Progress saved to browser storage successfully!');
    } catch (error) {
      console.error('Error saving to storage:', error);
      alert('Failed to save progress to browser storage.');
    }
  };
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Learning Assistant</h1>
            <p className="text-blue-100">Select a unit to continue your learning journey</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-2xl font-bold">{units.length}</div>
              <div className="text-sm text-blue-100">Available Units</div>
            </div>
            <BookOpen className="h-12 w-12 text-blue-200" />
          </div>
        </div>
      </div>

      {/* Add Unit Button */}
      <div className="flex justify-end space-x-4">
        {units.length > 0 && (
          <>
            <button
              onClick={handleSaveToStorage}
              className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg"
            >
              <Save className="h-5 w-5 mr-2" />
              Save to Storage
            </button>
            <button
              onClick={handleExportProgress}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
            >
              <Download className="h-5 w-5 mr-2" />
              Export Progress
            </button>
          </>
        )}
        <button
          onClick={onAddUnit}
          className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-lg"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add New Unit
        </button>
      </div>

      {/* Units Grid */}
      {units.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Units Available</h3>
          <p className="text-gray-600 mb-6">Get started by adding your first learning unit</p>
          <button
            onClick={onAddUnit}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Your First Unit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {units.map((unit) => {
            const progressPercentage = getProgressPercentage(unit);
            const isCompleted = progressPercentage === 100;
            const isInProgress = progressPercentage > 0 && progressPercentage < 100;
            
            return (
              <div
                key={unit.id}
                className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-all duration-200 cursor-pointer group"
                onClick={() => onSelectUnit(unit.id)}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {unit.title}
                      </h3>
                    </div>
                    <button
                      onClick={(e) => handleRemoveUnit(e, unit.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all duration-200"
                      title="Remove unit"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Progress</span>
                      <span className="text-sm font-medium text-gray-900">{progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progressPercentage)}`}
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-gray-900">{unit.totalTasks}</div>
                      <div className="text-xs text-gray-600">Total Tasks</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-gray-900">{unit.completedTasks}</div>
                      <div className="text-xs text-gray-600">Completed</div>
                    </div>
                  </div>

                  {/* Status and Date */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      {isCompleted && (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                          <span className="text-green-600 font-medium">Completed</span>
                        </>
                      )}
                      {isInProgress && (
                        <>
                          <Clock className="h-4 w-4 text-yellow-600 mr-1" />
                          <span className="text-yellow-600 font-medium">In Progress</span>
                        </>
                      )}
                      {!isCompleted && !isInProgress && (
                        <>
                          <BookOpen className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-gray-600">Not Started</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center text-gray-500">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>{unit.lastActivity?.toLocaleDateString() || unit.dateAdded.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};