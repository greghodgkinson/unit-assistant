import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { Unit } from '../types/Unit';

interface UnitUploadProps {
  onUnitUploaded: (unit: Unit) => void;
  onBack: () => void;
}

export const UnitUpload: React.FC<UnitUploadProps> = ({ onUnitUploaded, onBack }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateUnit = (data: any): Unit => {
    // Basic validation
    if (!data.id || typeof data.id !== 'string') {
      throw new Error('Unit must have a valid id');
    }
    if (!data.title || typeof data.title !== 'string') {
      throw new Error('Unit must have a valid title');
    }
    if (!data.learning_outcomes || !Array.isArray(data.learning_outcomes)) {
      throw new Error('Unit must have learning_outcomes array');
    }
    if (data.learning_outcomes.length === 0) {
      throw new Error('Unit must have at least one learning outcome');
    }

    // Validate learning outcomes structure
    data.learning_outcomes.forEach((lo: any, index: number) => {
      if (!lo.id || !lo.description || !lo.outcome_tasks || !Array.isArray(lo.outcome_tasks)) {
        throw new Error(`Learning outcome ${index + 1} is missing required fields`);
      }
      if (lo.outcome_tasks.length === 0) {
        throw new Error(`Learning outcome ${index + 1} must have at least one task`);
      }
      
      lo.outcome_tasks.forEach((task: any, taskIndex: number) => {
        if (!task.id || !task.description || !task.type || !task.acceptance_criteria) {
          throw new Error(`Task ${taskIndex + 1} in learning outcome ${index + 1} is missing required fields`);
        }
      });
    });

    return data as Unit;
  };

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.json')) {
      setError('Please upload a JSON file');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const validatedUnit = validateUnit(data);
      
      setSuccess(true);
      setTimeout(() => {
        onUnitUploaded(validatedUnit);
      }, 1000);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON file format');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to process unit file');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
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
        </div>
        
        <div className="text-center">
          <Upload className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload New Unit</h1>
          <p className="text-gray-600">Upload a JSON file containing your learning unit data</p>
        </div>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : success
              ? 'border-green-500 bg-green-50'
              : error
              ? 'border-red-500 bg-red-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileInput}
            className="hidden"
          />

          {uploading ? (
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600">Processing unit file...</p>
            </div>
          ) : success ? (
            <div className="space-y-4">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              <p className="text-green-600 font-medium">Unit uploaded successfully!</p>
              <p className="text-sm text-gray-600">Redirecting to unit list...</p>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto" />
              <p className="text-red-600 font-medium">Upload Failed</p>
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={openFileDialog}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <FileText className="h-12 w-12 text-gray-400 mx-auto" />
              <div>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drop your JSON file here, or{' '}
                  <button
                    onClick={openFileDialog}
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    browse
                  </button>
                </p>
                <p className="text-sm text-gray-600">
                  Supports JSON files with valid unit structure
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* File Format Info */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Expected File Format</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>Your JSON file should contain:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><code className="bg-blue-100 px-1 rounded">id</code> - Unique identifier for the unit</li>
            <li><code className="bg-blue-100 px-1 rounded">title</code> - Unit title</li>
            <li><code className="bg-blue-100 px-1 rounded">instructions</code> - Learning instructions</li>
            <li><code className="bg-blue-100 px-1 rounded">scenario</code> - Learning scenario</li>
            <li><code className="bg-blue-100 px-1 rounded">task</code> - Main task description</li>
            <li><code className="bg-blue-100 px-1 rounded">learning_outcomes</code> - Array of learning outcomes with tasks</li>
          </ul>
          <p className="mt-3">
            <span className="font-medium">Tip:</span> You can use the existing unit-1.json as a template for the required structure.
          </p>
        </div>
      </div>
    </div>
  );
};