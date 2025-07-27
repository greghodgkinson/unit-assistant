import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Settings as SettingsIcon, Save, RotateCcw, CheckCircle, AlertCircle, Plus, Trash2, GripVertical, Clock } from 'lucide-react';

interface SettingsProps {
  onBack: () => void;
}

interface WorkingPeriod {
  id: string;
  startTime: string;
  endTime: string;
}

interface WorkingHours {
  [key: string]: WorkingPeriod[];
}

export const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const [feedbackServiceUrl, setFeedbackServiceUrl] = useState('');
  const [exampleQuestions, setExampleQuestions] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [workingHours, setWorkingHours] = useState<WorkingHours>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const DEFAULT_URL = 'https://unit-assistant-service.fly.dev/feedback';
  const STORAGE_KEY = 'learning-assistant-feedback-service-url';
  const QUESTIONS_STORAGE_KEY = 'learning-assistant-example-questions';
  const WORKING_HOURS_STORAGE_KEY = 'learning-assistant-working-hours';

  const DEFAULT_QUESTIONS = [
    "Can you help me understand what this task is asking for?",
    "What are the key points I should cover in my answer?",
    "How should I structure my response?",
    "Can you give me an example of what a good answer might include?",
    "What does this acceptance criteria mean exactly?",
    "How much detail is expected for this type of task?"
  ];

  const DAYS_OF_WEEK = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ];

  const DEFAULT_WORKING_HOURS: WorkingHours = {
    monday: [{ id: '1', startTime: '09:00', endTime: '17:00' }],
    tuesday: [{ id: '1', startTime: '09:00', endTime: '17:00' }],
    wednesday: [{ id: '1', startTime: '09:00', endTime: '17:00' }],
    thursday: [{ id: '1', startTime: '09:00', endTime: '17:00' }],
    friday: [{ id: '1', startTime: '09:00', endTime: '17:00' }],
    saturday: [],
    sunday: []
  };

  useEffect(() => {
    // Load saved URL or use default
    const savedUrl = localStorage.getItem(STORAGE_KEY);
    setFeedbackServiceUrl(savedUrl || DEFAULT_URL);
    
    // Load saved questions or use defaults
    const savedQuestions = localStorage.getItem(QUESTIONS_STORAGE_KEY);
    setExampleQuestions(savedQuestions ? JSON.parse(savedQuestions) : DEFAULT_QUESTIONS);
    
    // Load saved working hours or use defaults
    const savedWorkingHours = localStorage.getItem(WORKING_HOURS_STORAGE_KEY);
    setWorkingHours(savedWorkingHours ? JSON.parse(savedWorkingHours) : DEFAULT_WORKING_HOURS);
  }, []);

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = () => {
    if (!feedbackServiceUrl.trim()) {
      setError('URL cannot be empty');
      return;
    }

    if (!validateUrl(feedbackServiceUrl)) {
      setError('Please enter a valid URL');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      localStorage.setItem(STORAGE_KEY, feedbackServiceUrl);
      localStorage.setItem(QUESTIONS_STORAGE_KEY, JSON.stringify(exampleQuestions));
      localStorage.setItem(WORKING_HOURS_STORAGE_KEY, JSON.stringify(workingHours));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFeedbackServiceUrl(DEFAULT_URL);
    setExampleQuestions(DEFAULT_QUESTIONS);
    setWorkingHours(DEFAULT_WORKING_HOURS);
    setError(null);
    setSaved(false);
  };

  const handleAddQuestion = () => {
    if (newQuestion.trim() && !exampleQuestions.includes(newQuestion.trim())) {
      setExampleQuestions([...exampleQuestions, newQuestion.trim()]);
      setNewQuestion('');
    }
  };

  const handleRemoveQuestion = (index: number) => {
    setExampleQuestions(exampleQuestions.filter((_, i) => i !== index));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null) return;
    
    const newQuestions = [...exampleQuestions];
    const draggedQuestion = newQuestions[draggedIndex];
    
    // Remove the dragged item
    newQuestions.splice(draggedIndex, 1);
    
    // Insert at the new position
    const insertIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
    newQuestions.splice(insertIndex, 0, draggedQuestion);
    
    setExampleQuestions(newQuestions);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const addWorkingPeriod = (day: string) => {
    const newPeriod: WorkingPeriod = {
      id: Date.now().toString(),
      startTime: '09:00',
      endTime: '17:00'
    };
    
    setWorkingHours(prev => ({
      ...prev,
      [day]: [...(prev[day] || []), newPeriod]
    }));
  };

  const removeWorkingPeriod = (day: string, periodId: string) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: prev[day]?.filter(period => period.id !== periodId) || []
    }));
  };

  const updateWorkingPeriod = (day: string, periodId: string, field: 'startTime' | 'endTime', value: string) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: prev[day]?.map(period => 
        period.id === periodId ? { ...period, [field]: value } : period
      ) || []
    }));
  };

  const formatWorkingHoursSummary = (periods: WorkingPeriod[]) => {
    if (!periods || periods.length === 0) return 'No working hours';
    return periods.map(period => `${period.startTime} - ${period.endTime}`).join(', ');
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
          <SettingsIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Configure your learning assistant preferences</p>
          
          {/* Action Buttons */}
          <div className="flex justify-center space-x-3 mt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            
            <button
              onClick={handleReset}
              className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Default
            </button>
          </div>
          
          {/* Status Messages */}
          {error && (
            <div className="flex items-center justify-center p-3 bg-red-50 border border-red-200 rounded-lg mt-4">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800 text-sm">{error}</span>
            </div>
          )}

          {saved && (
            <div className="flex items-center justify-center p-3 bg-green-50 border border-green-200 rounded-lg mt-4">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-800 text-sm">Settings saved successfully!</span>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Service Configuration */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Feedback Service</h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="feedback-url" className="block text-sm font-medium text-gray-700 mb-2">
              Service URL
            </label>
            <input
              id="feedback-url"
              type="url"
              value={feedbackServiceUrl}
              onChange={(e) => {
                setFeedbackServiceUrl(e.target.value);
                setError(null);
                setSaved(false);
              }}
              placeholder="https://your-service.fly.dev/feedback"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              URL of the feedback service endpoint for task evaluation
            </p>
          </div>
        </div>
      </div>

      {/* Example Questions Management */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Example Questions</h2>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Manage example questions that students can quickly select when asking the assistant for help.
          </p>
          
          {/* Add New Question */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Enter a new example question..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleAddQuestion()}
            />
            <button
              onClick={handleAddQuestion}
              disabled={!newQuestion.trim()}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </button>
          </div>
          
          {/* Questions List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {exampleQuestions.map((question, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 cursor-move ${
                  draggedIndex === index 
                    ? 'bg-blue-100 border-blue-300 opacity-50' 
                    : dragOverIndex === index
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <div className="flex items-center flex-1">
                  <GripVertical className="h-4 w-4 text-gray-400 mr-3 flex-shrink-0" />
                  <span className="text-sm text-gray-800 flex-1">{question}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                    {index + 1}
                  </span>
                  <button
                    onClick={() => handleRemoveQuestion(index)}
                    className="p-1 text-red-600 hover:text-red-800 transition-colors"
                    title="Remove question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {exampleQuestions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No example questions configured.</p>
              <p className="text-sm">Add some questions above to help students get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* Working Hours Configuration */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          Working Hours
        </h2>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Define your working hours for each day of the week. You can add multiple working periods per day.
          </p>
          
          {DAYS_OF_WEEK.map(day => (
            <div key={day.key} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-medium text-gray-900">{day.label}</h3>
                  <p className="text-sm text-gray-500">
                    {formatWorkingHoursSummary(workingHours[day.key] || [])}
                  </p>
                </div>
                <button
                  onClick={() => addWorkingPeriod(day.key)}
                  className="flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Period
                </button>
              </div>
              
              {workingHours[day.key] && workingHours[day.key].length > 0 && (
                <div className="space-y-2">
                  {workingHours[day.key].map((period, index) => (
                    <div key={period.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600">From:</label>
                        <input
                          type="time"
                          value={period.startTime}
                          onChange={(e) => updateWorkingPeriod(day.key, period.id, 'startTime', e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600">To:</label>
                        <input
                          type="time"
                          value={period.endTime}
                          onChange={(e) => updateWorkingPeriod(day.key, period.id, 'endTime', e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <button
                        onClick={() => removeWorkingPeriod(day.key, period.id)}
                        className="p-1 text-red-600 hover:text-red-800 transition-colors"
                        title="Remove working period"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {(!workingHours[day.key] || workingHours[day.key].length === 0) && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No working hours set for {day.label}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};