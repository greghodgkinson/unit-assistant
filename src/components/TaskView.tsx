import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, MessageCircle, Save, ChevronDown, ChevronRight, Clock, BookOpen } from 'lucide-react';
import { LearningOutcome, TaskItem, StudentAnswer } from '../types/Unit';

interface TaskViewProps {
  learningOutcome: LearningOutcome;
  task: TaskItem;
  answer?: StudentAnswer;
  onAnswerUpdate: (content: string) => void;
  onRequestFeedback: () => Promise<void>;
  onMarkComplete: () => void;
  onNavigateBack: () => void;
  onNavigateNext: () => void;
  hasNext: boolean;
  totalTasks?: number;
  completedTasks?: number;
  currentTaskNumber?: number;
}

export const TaskView: React.FC<TaskViewProps> = ({
  learningOutcome,
  task,
  answer,
  onAnswerUpdate,
  onRequestFeedback,
  onMarkComplete,
  onNavigateBack,
  onNavigateNext,
 hasNext,
  totalTasks = 0,
  completedTasks = 0,
  currentTaskNumber = 1
}) => {
  const [content, setContent] = useState(answer?.content || '');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isRequestingFeedback, setIsRequestingFeedback] = useState(false);
  const [showAcceptanceCriteria, setShowAcceptanceCriteria] = useState(false);
  const [showIndicativeContent, setShowIndicativeContent] = useState(false);

  // Update content when task changes
  useEffect(() => {
    setContent(answer?.content || '');
    setHasUnsavedChanges(false);
  }, [answer, task.id]);

  const handleContentChange = (value: string) => {
    setContent(value);
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    onAnswerUpdate(content);
    setHasUnsavedChanges(false);
  };

  const handleRequestFeedback = async () => {
    setIsRequestingFeedback(true);
    try {
      await onRequestFeedback();
    } finally {
      setIsRequestingFeedback(false);
    }
  };

  const getTaskTypeColor = (type: string) => {
    switch (type) {
      case 'standard': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'merit': return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'distinction': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatCriteriaText = (text: string) => {
    const listItemRegex = /\b([a-z])\)\s*/gi;
    const protectedPattern = /\b(part\s+[a-z])\)/gi;

    // Step 1: Protect phrases like "part c)"
    const protectedText = text.replace(protectedPattern, (_, g1) => `__PROTECT__${g1})__`);

    // Step 2: Normalize newlines and spaces
    const lines = protectedText
      .split(/\n+/)
      .map(line => line.trim())
      .filter(Boolean);

    const merged = lines.join(' '); // Merge into a single block

    // Step 3: Split into intro and lettered items
    const segments = merged.split(listItemRegex); // [intro, a, content, b, content, ...]

    const intro = segments[0] ? segments[0].trim() : '';
    const items = [];
    for (let i = 1; i < segments.length; i += 2) {
      const letter = segments[i];
      const content = segments[i + 1] || '';
      items.push({ letter, content: content.trim() });
    }

    // Step 4: Restore protected phrases
    const restoreProtected = (s: string) =>
      s.replace(/__PROTECT__(part\s+[a-z])\)__/gi, '$1)');

    return (
      <div className="text-gray-800 space-y-3">
        {intro && <p>{restoreProtected(intro)}</p>}
        {items.map((item, index) => (
          <div key={index} className="flex items-start">
            <span className="font-bold mr-2">{item.letter})</span>
            <span>{restoreProtected(item.content)}</span>
          </div>
        ))}
      </div>
    );
  };

  const getTaskStatus = () => {
    if (!answer) return 'not-started';
    if (answer.isGoodEnough) return 'completed';
    return 'in-progress';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in-progress': return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'not-started': return <BookOpen className="h-5 w-5 text-gray-400" />;
      default: return <BookOpen className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in-progress': return 'In Progress';
      case 'not-started': return 'Not Started';
      default: return 'Not Started';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'in-progress': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'not-started': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const taskStatus = getTaskStatus();
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onNavigateBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center space-x-4">
            {/* Current Task Status */}
            <div className={`flex items-center px-3 py-1 rounded-full border ${getStatusColor(taskStatus)}`}>
              {getStatusIcon(taskStatus)}
              <span className="ml-2 text-sm font-medium">{getStatusText(taskStatus)}</span>
            </div>
            
            {/* Overall Progress */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <BookOpen className="h-4 w-4" />
              <span>Task {currentTaskNumber} of {totalTasks}</span>
              <span className="text-gray-400">•</span>
              <span>{progressPercentage}% Complete</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{learningOutcome.id}: {task.id}</h1>
            <p className="text-gray-600 mt-2">{learningOutcome.description}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getTaskTypeColor(task.type)}`}>
            {task.type}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Overall Progress</span>
            <span className="text-sm text-gray-600">{completedTasks} of {totalTasks} tasks completed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Task Description */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Task Description</h2>
        <p className="text-gray-700 leading-relaxed">{task.description}</p>
      </div>

      {/* Acceptance Criteria */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <button
          onClick={() => setShowAcceptanceCriteria(!showAcceptanceCriteria)}
          className="flex items-center justify-between w-full text-left"
        >
          <h2 className="text-lg font-semibold text-gray-900">Acceptance Criteria</h2>
          {showAcceptanceCriteria ? (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-500" />
          )}
        </button>
        
        {showAcceptanceCriteria && (
          <div className="mt-4 space-y-3">
            {task.acceptance_criteria.map((criteria, index) => (
              <div key={criteria.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                {formatCriteriaText(criteria.criteria)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Indicative Content */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <button
          onClick={() => setShowIndicativeContent(!showIndicativeContent)}
          className="flex items-center justify-between w-full text-left"
        >
          <h2 className="text-lg font-semibold text-gray-900">Indicative Content</h2>
          {showIndicativeContent ? (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-500" />
          )}
        </button>
        
        {showIndicativeContent && (
          <div className="mt-4">
            <ul className="space-y-2">
              {learningOutcome.indicative_content.map((content, index) => (
                <li key={index} className="flex items-start">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span className="text-gray-700">{content.description}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Answer Section */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Your Answer</h2>
          <div className="flex space-x-3">
            {hasUnsavedChanges && (
              <button
                onClick={handleSave}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </button>
            )}
            {answer && !answer.isGoodEnough && (
              <button
                onClick={handleRequestFeedback}
                disabled={isRequestingFeedback}
                className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                {isRequestingFeedback ? 'Requesting...' : 'Request Feedback'}
              </button>
            )}
            {answer && !answer.isGoodEnough && (
              <button
                onClick={onMarkComplete}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Complete
              </button>
            )}
          </div>
        </div>
        
        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Enter your answer here..."
          className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
        
        {answer && (
          <div className="mt-4 text-sm text-gray-600">
            <p>Last saved: {answer.lastModified.toLocaleString()}</p>
            <p>Version: {answer.version}</p>
          </div>
        )}
      </div>

      {/* Feedback Section */}
      {answer?.feedback && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Feedback</h2>
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-gray-800">{answer.feedback}</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onNavigateBack}
          className="flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </button>
        
        {hasNext && (
          <button
            onClick={onNavigateNext}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Next Task
            <ArrowRight className="h-4 w-4 ml-2" />
          </button>
        )}
      </div>
    </div>
  );
};