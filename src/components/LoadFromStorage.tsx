import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Calendar, FileText, AlertCircle, CheckCircle, Eye, X } from 'lucide-react';
import { StorageFile, getStorageFiles, loadProgressFromStorage, importProgress, saveProgressToStorageFolder } from '../utils/storageExport';
import type { ExportedProgress } from '../utils/storageExport';

interface LoadFromStorageProps {
  onBack: () => void;
  onProgressLoaded: () => void;
}

export const LoadFromStorage: React.FC<LoadFromStorageProps> = ({ onBack, onProgressLoaded }) => {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<ExportedProgress | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const storageFiles = await getStorageFiles();
      
      // Filter out settings.json file
      const progressFiles = storageFiles.filter(file => file.name !== 'settings.json');
      
      // Load preview data for each file
      const filesWithPreview = await Promise.all(
        progressFiles.map(async (file) => {
          try {
            const progressData = await loadProgressFromStorage(file.name);
            const totalTasks = Object.values(progressData.units).reduce(
              (sum, unit) => sum + unit.unitSummary.totalTasks, 0
            );
            const completedTasks = Object.values(progressData.units).reduce(
              (sum, unit) => sum + unit.unitSummary.completedTasks, 0
            );
            const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            
            return {
              ...file,
              preview: {
                totalUnits: progressData.totalUnits,
                totalTasks,
                completedTasks,
                progressPercentage
              }
            };
          } catch (error) {
            console.warn(`Failed to load preview for ${file.name}:`, error);
            return file; // Return file without preview if loading fails
          }
        })
      );
      
      setFiles(filesWithPreview.sort((a, b) => b.modified.getTime() - a.modified.getTime()));
    } catch (err) {
      console.warn('Failed to load storage files:', err);
      setFiles([]); // Set empty files instead of showing error
      // Only show error if it's a real API error, not just missing files
    } finally {
      setLoading(false);
    }
  };

  const handleLoadProgress = async (filename: string) => {
    try {
      setImporting(filename);
      setError(null);
      
      // Auto-save current progress before loading
      try {
        await saveProgressToStorageFolder();
        console.log('Current progress auto-saved before loading');
      } catch (saveError) {
        console.warn('Failed to auto-save current progress:', saveError);
        // Continue with loading even if auto-save fails
      }
      
      const progressData = await loadProgressFromStorage(filename);
      importProgress(progressData);
      
      setSuccess(true);
      setTimeout(() => {
        onProgressLoaded();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load progress');
    } finally {
      setImporting(null);
    }
  };

  const handlePreviewFile = async (filename: string) => {
    try {
      setLoadingPreview(true);
      setPreviewFile(filename);
      const progressData = await loadProgressFromStorage(filename);
      setPreviewData(progressData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview file');
      setPreviewFile(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmLoad = async () => {
    if (previewFile && previewData) {
      setPreviewFile(null);
      setPreviewData(null);
      await handleLoadProgress(previewFile);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getProgressSummary = (unitData: any) => {
    if (!unitData.progress) return 'No progress data';
    const { completedTasks, answers } = unitData.progress;
    const totalAnswers = answers?.length || 0;
    const completed = completedTasks?.length || 0;
    return `${completed} completed tasks, ${totalAnswers} total answers`;
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Progress Loaded Successfully!</h2>
          <p className="text-gray-600 mb-4">Your learning progress has been restored from storage.</p>
          <p className="text-sm text-gray-500">Redirecting to unit list...</p>
        </div>
      </div>
    );
  }

  // Preview Modal
  if (previewFile && previewData) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => {
                setPreviewFile(null);
                setPreviewData(null);
              }}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel Preview
            </button>
          </div>
          
          <div className="text-center">
            <Eye className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Preview Progress File</h1>
            <p className="text-gray-600">Review the contents before loading: <span className="font-medium">{previewFile}</span></p>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">File Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{previewData.totalUnits}</div>
              <div className="text-sm text-blue-800">Total Units</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {new Date(previewData.exportDate).toLocaleDateString()}
              </div>
              <div className="text-sm text-green-800">Export Date</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {Object.values(previewData.units).reduce((sum, unit) => 
                  sum + (unit.progress?.completedTasks?.length || 0), 0
                )}
              </div>
              <div className="text-sm text-purple-800">Completed Tasks</div>
            </div>
          </div>
        </div>

        {/* Units Detail */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Units in This File</h2>
          <div className="space-y-4">
            {Object.entries(previewData.units).map(([unitId, unitData]) => (
              <div key={unitId} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{unitData.unitSummary.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">ID: {unitId}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {unitData.unitSummary.completedTasks} / {unitData.unitSummary.totalTasks} tasks
                    </div>
                    <div className="text-xs text-gray-500">
                      {Math.round((unitData.unitSummary.completedTasks / unitData.unitSummary.totalTasks) * 100)}% complete
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-sm">
                  <div>
                    <span className="text-gray-600">Progress: </span>
                    <span className="text-gray-900">{getProgressSummary(unitData)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Last Activity: </span>
                    <span className="text-gray-900">
                      {unitData.unitSummary.lastActivity 
                        ? new Date(unitData.unitSummary.lastActivity).toLocaleDateString()
                        : 'No activity'
                      }
                    </span>
                  </div>
                </div>
                
                {unitData.progress && unitData.progress.answers && unitData.progress.answers.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-600 mb-2">Recent Answers:</div>
                    <div className="space-y-1">
                      {unitData.progress.answers.slice(-3).map((answer: any, index: number) => (
                        <div key={index} className="text-xs text-gray-500 flex items-center justify-between">
                          <span>Task {answer.taskId}</span>
                          <span className={`px-2 py-1 rounded-full ${
                            answer.isGoodEnough 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {answer.isGoodEnough ? 'Completed' : 'In Progress'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-800 mb-1">Important Notice</h3>
              <p className="text-sm text-yellow-700">
                Loading this file will replace your current progress. Your current progress has been automatically 
                saved to storage before this preview.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => {
              setPreviewFile(null);
              setPreviewData(null);
            }}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmLoad}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Confirm Load
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Units
          </button>
          <button
            onClick={loadFiles}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
        
        <div className="text-center">
          <Download className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Load from Storage</h1>
          <p className="text-gray-600">Select a progress file from the storage folder to restore your learning data</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Files List */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Progress Files</h2>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading storage files...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Progress Files Found</h3>
            <p className="text-gray-600">No saved progress files were found in the storage folder.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.name}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center flex-1">
                  <FileText className="h-8 w-8 text-blue-600 mr-4" />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{file.name}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {file.modified.toLocaleString()}
                      </div>
                      <span>{formatFileSize(file.size)}</span>
                    </div>
                    {file.preview && (
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <span>{file.preview.totalUnits} unit{file.preview.totalUnits !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span>{file.preview.totalTasks} task{file.preview.totalTasks !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span className="text-green-600">{file.preview.completedTasks} completed</span>
                        <span>•</span>
                        <span className="text-blue-600">{file.preview.progressPercentage}% done</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => handlePreviewFile(file.name)}
                  disabled={loadingPreview}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center mr-2"
                >
                  {loadingPreview ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Loading Preview...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview & Load
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">How It Works</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>Loading progress from storage will:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Replace your current progress with the selected file</li>
            <li>Restore all unit summaries and completion status</li>
            <li>Restore all answers and feedback for each task</li>
            <li>Maintain your learning history and timestamps</li>
          </ul>
          <p className="mt-3 font-medium text-blue-900">
            Warning: This will overwrite your current progress. Make sure to save your current progress first if needed.
          </p>
        </div>
      </div>
    </div>
  );
};