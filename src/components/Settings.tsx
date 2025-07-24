import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings as SettingsIcon, Save, RotateCcw, CheckCircle, AlertCircle, Plus, Trash2 } from 'lucide-react';

interface SettingsProps {
  onBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const [feedbackServiceUrl, setFeedbackServiceUrl] = useState('');
  const [exampleQuestions, setExampleQuestions] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const DEFAULT_URL = 'https://unit-assistant-service.fly.dev/feedback';
  const STORAGE_KEY = 'learning-assistant-feedback-service-url';
  const QUESTIONS_STORAGE_KEY = 'learning-assistant-example-questions';

  const DEFAULT_QUESTIONS = [
    "Can you help me understand what this task is asking for?",
    "What are the key points I should cover in my answer?",
    "How should I structure my response?",
    "Can you give me an example of what a good answer might include?",
    "What does this acceptance criteria mean exactly?",
    "How much detail is expected for this type of task?"
  ];

  useEffect(() => {
    // Load saved URL or use default
    const savedUrl = localStorage.getItem(STORAGE_KEY);
    setFeedbackServiceUrl(savedUrl || DEFAULT_URL);
    
    // Load saved questions or use defaults
    const savedQuestions = localStorage.getItem(QUESTIONS_STORAGE_KEY);
    setExampleQuestions(savedQuestions ? JSON.parse(savedQuestions) : DEFAULT_QUESTIONS);
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

          {error && (
            <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800 text-sm">{error}</span>
            </div>
          )}

          {saved && (
            <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-800 text-sm">Settings saved successfully!</span>
            </div>
          )}

          <div className="flex space-x-3">
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
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <span className="text-sm text-gray-800 flex-1">{question}</span>
                <button
                  onClick={() => handleRemoveQuestion(index)}
                  className="ml-3 p-1 text-red-600 hover:text-red-800 transition-colors"
                  title="Remove question"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
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

      {/* Information */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">About Feedback Service</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>
            The feedback service provides AI-powered evaluation of your task responses. 
            It analyzes your answers against the acceptance criteria and provides detailed feedback.
          </p>
          <p>
            <span className="font-medium">Default Service:</span> The default service is hosted on Fly.dev 
            and provides reliable feedback for all task types.
          </p>
          <p>
            <span className="font-medium">Custom Service:</span> You can configure a custom feedback service 
            URL if you're running your own instance or using a different provider.
          </p>
        </div>
      </div>
    </div>
  );
};