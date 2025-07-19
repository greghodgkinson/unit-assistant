import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Calendar, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { StorageFile, getStorageFiles, loadProgressFromStorage, importProgress, saveProgressToStorageFolder } from '../utils/storageExport';

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

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const storageFiles = await getStorageFiles();
      setFiles(storageFiles.sort((a, b) => b.modified.getTime() - a.modified.getTime()));
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
                  </div>
                </div>
                
                <button
                  onClick={() => handleLoadProgress(file.name)}
                  disabled={importing === file.name}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {importing === file.name ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Load
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