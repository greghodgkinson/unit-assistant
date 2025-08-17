import React, { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { ArrowLeft, ArrowRight, CheckCircle, MessageCircle, Save, ChevronDown, ChevronRight, Clock, BookOpen, Maximize2, Minimize2, HelpCircle, Send, Target, FileText, CheckSquare, Compass, Undo, Redo, Volume2, VolumeX, List } from 'lucide-react';
import { LearningOutcome, TaskItem, StudentAnswer } from '../types/Unit';
import { askStudentQuestion, StudentQuestionRequest, StudentQuestionResponse } from '../utils/feedbackService';
import { WorkingTimeIndicator } from './WorkingTimeIndicator';
import { DEFAULT_EXAMPLE_QUESTIONS } from '../constants/defaultQuestions';

interface TaskViewProps {
  learningOutcome: LearningOutcome;
  task: TaskItem;
  unitId: string;
  unit: Unit;
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
  unitId,
  unit,
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
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [isRequestingFeedback, setIsRequestingFeedback] = useState(false);
  const [showAcceptanceCriteria, setShowAcceptanceCriteria] = useState(true);
  const [showIndicativeContent, setShowIndicativeContent] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAskAssistant, setShowAskAssistant] = useState(false);
  const [studentQuestion, setStudentQuestion] = useState('');
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);
  const [assistantResponse, setAssistantResponse] = useState<StudentQuestionResponse | null>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [isUndoRedoAction, setIsUndoRedoAction] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  // Autosave timer ref
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const quillRef = useRef<ReactQuill>(null);

  // Get unit task context
  const unitTaskContext = unit.unit_tasks?.find(unitTask => 
    unitTask.learning_outcomes.includes(learningOutcome.id) && 
    unitTask.outcome_tasks.includes(task.id)
  );

  // Load example questions from localStorage
  const [exampleQuestions, setExampleQuestions] = useState<string[]>([]);
  
  // Check for speech synthesis support
  useEffect(() => {
    setSpeechSupported('speechSynthesis' in window);
  }, []);

  useEffect(() => {
    // Default questions are now managed in Settings component
    const savedQuestions = localStorage.getItem('learning-assistant-example-questions');
    if (savedQuestions) {
      try {
        const parsed = JSON.parse(savedQuestions);
        setExampleQuestions(parsed.length > 0 ? parsed : DEFAULT_EXAMPLE_QUESTIONS);
      } catch (error) {
        console.error('Error parsing saved questions:', error);
        setExampleQuestions(DEFAULT_EXAMPLE_QUESTIONS);
      }
    } else {
      setExampleQuestions(DEFAULT_EXAMPLE_QUESTIONS);
    }
  }, []);

  // Rich text editor configuration
  const quillModules = {
    toolbar: [
      ['undo', 'redo'],
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['link'],
      ['clean']
    ],
    history: {
      delay: 1000,
      maxStack: 50,
      userOnly: true
    }
  };

  const quillFormats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent', 'link'
  ];

  // Update content when task changes
  useEffect(() => {
    setContent(answer?.content || '');
    setUndoStack([]);
    setRedoStack([]);
    setHasUnsavedChanges(false);
    setLastAutoSave(null);
    // Clear any existing autosave timer when task changes
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }, [answer, task.id]);

  // Cleanup autosave timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  // Initialize undo stack when content is first loaded
  useEffect(() => {
    if (content && undoStack.length === 0) {
      setUndoStack([content]);
    }
  }, [content]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (((e.ctrlKey || e.metaKey) && e.key === 'y') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z')) {
        e.preventDefault();
        handleRedo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, redoStack, content]);

  const performAutoSave = async () => {
    if (!hasUnsavedChanges) return;
    
    setIsAutoSaving(true);
    try {
      onAnswerUpdate(content);
      setHasUnsavedChanges(false);
      setLastAutoSave(new Date());
    } catch (error) {
      console.error('Autosave failed:', error);
    } finally {
      setIsAutoSaving(false);
    }
  };

  const scheduleAutoSave = () => {
    // Clear existing timer
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    
    // Schedule new autosave in 60 seconds
    autosaveTimerRef.current = setTimeout(() => {
      performAutoSave();
    }, 30000); // 30 seconds
  };

  const handleContentChange = (value: string) => {
    // Don't add to undo stack if this is an undo/redo action
    if (!isUndoRedoAction && value !== content) {
      setUndoStack(prev => {
        const newStack = [...prev, content];
        // Limit stack size to prevent memory issues
        return newStack.length > 50 ? newStack.slice(-50) : newStack;
      });
      setRedoStack([]); // Clear redo stack when new content is added
    }
    
    setIsUndoRedoAction(false);
    setContent(value);
    setHasUnsavedChanges(true);
    scheduleAutoSave();
  };

  const handleUndo = () => {
    if (undoStack.length > 1) {
      const newUndoStack = [...undoStack];
      const currentContent = newUndoStack.pop()!; // Remove current state
      const previousContent = newUndoStack[newUndoStack.length - 1]; // Get previous state
      
      setRedoStack(prev => [...prev, currentContent]);
      setUndoStack(newUndoStack);
      setIsUndoRedoAction(true);
      setContent(previousContent);
      setHasUnsavedChanges(true);
      
      // Focus the editor after undo
      if (quillRef.current) {
        const editor = quillRef.current.getEditor();
        editor.focus();
      }
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const newRedoStack = [...redoStack];
      const nextContent = newRedoStack.pop()!;
      
      setUndoStack(prev => [...prev, content]);
      setRedoStack(newRedoStack);
      setIsUndoRedoAction(true);
      setContent(nextContent);
      setHasUnsavedChanges(true);
      
      // Focus the editor after redo
      if (quillRef.current) {
        const editor = quillRef.current.getEditor();
        editor.focus();
      }
    }
  };

  const handleSave = () => {
    // Clear autosave timer since we're manually saving
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    
    onAnswerUpdate(content);
    setHasUnsavedChanges(false);
    setLastAutoSave(new Date());
  };

  const handleAskQuestion = async () => {
    if (!studentQuestion.trim()) return;
    
    setIsAskingQuestion(true);
    try {
      const questionRequest: StudentQuestionRequest = {
        unitId: unitId,
        studentQuestion: studentQuestion,
        answerText: content.trim(),
        taskDetails: {
          description: task.description,
          acceptance_criteria: task.acceptance_criteria.map(ac => ({
            criteria: ac.criteria
          }))
        },
        learningOutcome: {
          description: learningOutcome.description,
          indicative_content: learningOutcome.indicative_content
        }
      };
      
      const response = await askStudentQuestion(questionRequest);
      setAssistantResponse(response);
    } catch (error) {
      console.error('Error asking question:', error);
      setAssistantResponse({
        answer: `Error: ${error instanceof Error ? error.message : 'Failed to get response from assistant'}`
      });
    } finally {
      setIsAskingQuestion(false);
    }
  };

  const handleRequestFeedback = async () => {
    setIsRequestingFeedback(true);
    try {
      await onRequestFeedback();
    } finally {
      setIsRequestingFeedback(false);
    }
  };

  const handleExampleQuestionClick = (question: string) => {
    setStudentQuestion(question);
  };

  const handleSpeakResponse = (text: string) => {
    if (!speechSupported) {
      alert('Text-to-speech is not supported in your browser');
      return;
    }

    if (isSpeaking) {
      // Stop current speech
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Clean up the text for better speech
    const cleanText = text
      .replace(/\*\*/g, '') // Remove markdown bold
      .replace(/\n+/g, '. ') // Replace line breaks with pauses
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Configure speech settings
    utterance.rate = 0.9; // Slightly slower for better comprehension
    utterance.pitch = 1;
    utterance.volume = 0.8;

    // Event handlers
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      console.error('Speech synthesis error');
    };

    // Speak the text
    window.speechSynthesis.speak(utterance);
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
    const listItemLineRegex = /^([a-z])\)$/i; // line with just "a)"
    const listItemInlineRegex = /\b([a-z])\)\s*/gi;
    const protectRegex = /\b(part\s+[a-z])\)/gi;

    // Step 1: Protect things like "part c)"
    let lines = text
      .replace(protectRegex, (_, g1) => `__PROTECT__${g1})__`)
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    let intro = '';
    let items: { letter: string; content: string }[] = [];
    let current: { letter: string; content: string } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (listItemLineRegex.test(line)) {
        // This line is just 'a)', 'b)', etc.
        const letter = line[0];
        if (current) items.push(current);
        current = { letter, content: '' };
      } else if (current) {
        // Append line to current item's content
        current.content += (current.content ? ' ' : '') + line;
      } else {
        intro += (intro ? ' ' : '') + line;
      }
    }
    if (current) items.push(current);

    // Step 2: Restore protected parts
    const restore = (s: string) =>
      s.replace(/__PROTECT__(part\s+[a-z])\)__/gi, '$1)');

    return (
      <div className="text-gray-800 space-y-3">
        {intro && <p>{restore(intro)}</p>}
        {items.length > 0 && (
          <ul className="list-none space-y-2 ml-4">
            {items.map((item, idx) => (
              <li key={idx} className="flex items-start">
                <span className="font-bold mr-2">{item.letter})</span>
                <span>{restore(item.content)}</span>
              </li>
            ))}
          </ul>
        )}
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

  const getCleanTaskDescription = (description: string) => {
    // Remove number at the beginning if it starts with a number followed by a period and space
    // Also remove (LO#) pattern at the end if it exists
    return description
      .replace(/^\d+\.\d+\s+/, '')
      .replace(/\s*\(LO\d+\)\s*$/, '');
  };
  

  const formatFeedback = (feedback: string) => {
    let cleanFeedback = feedback.replace(/^Feedback\s*/i, '').trim();
    cleanFeedback = cleanFeedback
      .replace(/[�]/g, '') // Remove replacement character
      .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ''); // Remove other non-ASCII printable chars

    // Remove Level: and Score: lines from anywhere in the feedback
    cleanFeedback = cleanFeedback.replace(/\n\s*Level:\s*.*$/gim, '');
    cleanFeedback = cleanFeedback.replace(/\n\s*Score:\s*.*$/gim, '');
    cleanFeedback = cleanFeedback.replace(/Level:\s*.*$/gim, '');
    cleanFeedback = cleanFeedback.replace(/Score:\s*.*$/gim, '');
    cleanFeedback = cleanFeedback.trim();

    const headerRegex = /\*\*([^*]+)\*\*/g;
    const sections: { type: 'header' | 'content'; text: string }[] = [];
    const headers: { header: string; index: number }[] = [];
    let match: RegExpExecArray | null;

    while ((match = headerRegex.exec(cleanFeedback)) !== null) {
      headers.push({ header: match[1].trim(), index: match.index });
    }

    for (let i = 0; i < headers.length; i++) {
      const current = headers[i];
      const next = headers[i + 1];
      const contentStart = cleanFeedback.indexOf('**', current.index) + current.header.length + 4;
      const contentEnd = next ? next.index : cleanFeedback.length;
      const content = cleanFeedback.slice(contentStart, contentEnd).trim();

      sections.push({ type: 'header', text: current.header });
      sections.push({ type: 'content', text: content || '(No suggestions provided.)' });
    }

    return (
      <div className="space-y-4">
        {sections.map((section, index) => (
          <div key={index}>
            {section.type === 'header' ? (
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-3">
                {section.text}
              </h3>
            ) : (
              <div className="text-gray-700 leading-relaxed">
                {section.text.trim()
                  ? section.text.split(/\n{2,}|\n/).map((paragraph, pIndex) => (
                      <p key={pIndex} className="mb-2">{paragraph.trim()}</p>
                    ))
                  : <p className="italic text-gray-500">No suggestions provided.</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };
  
  const taskStatus = getTaskStatus();
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden">
        {/* Working Time Indicator */}
        <WorkingTimeIndicator />
        
        {/* Fullscreen Header */}
        <div className="bg-white border-b p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsFullscreen(false)}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Minimize2 className="h-5 w-5 mr-2" />
              Exit Fullscreen
            </button>
            <div className="text-sm text-gray-600">
              {learningOutcome.id}: {task.id}
            </div>
          </div>
          <div className="flex items-center space-x-3 mr-72">
            {hasUnsavedChanges && (
              <button
                onClick={handleSave}
                disabled={isAutoSaving}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="h-4 w-4 mr-2" />
                {isAutoSaving ? 'Auto-saving...' : 'Save'}
              </button>
            )}
            {isAutoSaving && !hasUnsavedChanges && (
              <div className="flex items-center text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Auto-saving...
              </div>
            )}
            {lastAutoSave && !hasUnsavedChanges && !isAutoSaving && (
              <div className="text-sm text-green-600">
                Auto-saved at {lastAutoSave.toLocaleTimeString()}
              </div>
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
            {answer && answer.isGoodEnough && (
              <button
                onClick={() => onMarkComplete()}
                className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                <Clock className="h-4 w-4 mr-2" />
                Mark Incomplete
              </button>
            )}
          </div>
        </div>

        {/* Fullscreen Answer Section */}
        <div className="flex-1 p-6 overflow-y-auto flex min-h-0">
          {/* Answer Section */}
          <div className="flex-1 flex flex-col mr-6 min-h-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Your Answer</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleUndo}
                  disabled={undoStack.length <= 1}
                  className="flex items-center px-3 py-1 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-gray-300 rounded-lg hover:bg-gray-50"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo className="h-4 w-4 mr-1" />
                  Undo
                </button>
                <button
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className="flex items-center px-3 py-1 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-gray-300 rounded-lg hover:bg-gray-50"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo className="h-4 w-4 mr-1" />
                  Redo
                </button>
              </div>
            </div>
            <div className="flex-1 flex flex-col min-h-0">
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={content}
                onChange={handleContentChange}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Enter your answer here..."
                className="flex-1 min-h-0"
                style={{ height: '100%' }}
              />
            </div>
            {answer && (
              <div className="mt-4 text-sm text-gray-600">
                <p>Last saved: {answer.lastModified.toLocaleString()}</p>
                <p>Version: {answer.version}</p>
              </div>
            )}
          </div>

          {/* Ask Assistant Section in Fullscreen */}
          <div className={`bg-gray-50 rounded-xl border transition-all duration-300 flex-shrink-0 ${
            showAskAssistant ? 'w-80' : 'w-16'
          }`}>
            {!showAskAssistant ? (
              /* Collapsed state - just icon */
              <div className="p-4 flex justify-center">
                <button
                  onClick={() => setShowAskAssistant(true)}
                  className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                  title="Ask Assistant"
                >
                  <HelpCircle className="h-6 w-6" />
                </button>
              </div>
            ) : (
              /* Expanded state - full content */
              <div className="p-6 h-full overflow-y-auto flex flex-col">
                <button
                  onClick={() => setShowAskAssistant(false)}
                  className="flex items-center justify-between w-full text-left mb-4"
                >
                  <div className="flex items-center">
                    <HelpCircle className="h-5 w-5 text-purple-600 mr-2" />
                    <h2 className="text-lg font-semibold text-gray-900">Ask Assistant</h2>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                </button>
                
                <div className="space-y-4 flex-1 overflow-y-auto">
                  <div>
                    <label htmlFor="student-question-fullscreen" className="block text-sm font-medium text-gray-700 mb-2">
                      What would you like to ask?
                    </label>
                    <textarea
                      id="student-question-fullscreen"
                      value={studentQuestion}
                      onChange={(e) => setStudentQuestion(e.target.value)}
                      placeholder="Ask a question about this task, need clarification on requirements, or want help getting started..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                      rows={4}
                    />
                  </div>
                  
                  <button
                    onClick={handleAskQuestion}
                    disabled={!studentQuestion.trim() || isAskingQuestion}
                    className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isAskingQuestion ? 'Asking...' : 'Ask Question'}
                  </button>
                  
                  {/* Example Questions in Fullscreen */}
                  {exampleQuestions.length > 0 && !assistantResponse && (
                    <div className="space-y-2 flex-shrink-0">
                      <h4 className="text-sm font-medium text-gray-700">Quick Questions:</h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {exampleQuestions.map((question, index) => (
                          <button
                            key={index}
                            onClick={() => handleExampleQuestionClick(question)}
                            className="w-full text-left text-xs text-gray-600 hover:text-purple-600 hover:bg-purple-50 p-2 rounded border border-gray-200 hover:border-purple-200 transition-colors"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {assistantResponse && (
                    <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200 flex-shrink-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-purple-900">Assistant Response:</h4>
                        {speechSupported && (
                          <button
                            onClick={() => handleSpeakResponse(assistantResponse.answer)}
                            className={`p-1 rounded transition-colors ${
                              isSpeaking 
                                ? 'text-red-600 hover:text-red-700 hover:bg-red-50' 
                                : 'text-purple-600 hover:text-purple-700 hover:bg-purple-100'
                            }`}
                            title={isSpeaking ? 'Stop reading' : 'Read aloud'}
                          >
                            {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                      <div className="text-sm text-purple-800 space-y-2">
                        <div className="whitespace-pre-line">
                          {assistantResponse.answer.replace(/(\d+[\).])/g, '\n$1').replace(/\n\s*\n\s*\n/g, '\n\n')}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {assistantResponse && (
                    <button
                      onClick={() => {
                        setStudentQuestion('');
                        setAssistantResponse(null);
                      }}
                      className="text-sm text-gray-600 hover:text-gray-800 transition-colors flex-shrink-0"
                    >
                      Ask another question
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
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
            </div>
          </div>
        </div>
        
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center mb-2">
              <Target className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">{learningOutcome.id}: {task.id}</h1>
            </div>
            <div className="ml-11">
              <p className="text-gray-600">{getCleanTaskDescription(task.description)}</p>
              {unitTaskContext && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center mb-1">
                    <List className="h-4 w-4 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-blue-900">Part of: {unitTaskContext.id}</span>
                  </div>
                  <p className="text-sm text-blue-800">{unitTaskContext.description}</p>
                </div>
              )}
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getTaskTypeColor(task.type)}`}>
            {task.type}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Tasks Completed for Unit</span>
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

      {/* Acceptance Criteria */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <button
          onClick={() => setShowAcceptanceCriteria(!showAcceptanceCriteria)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center">
            <CheckCircle className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-lg font-semibold text-gray-900">Acceptance Criteria</h2>
          </div>
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
          <div className="flex items-center">
            <Compass className="h-6 w-6 text-gray-600 mr-3" />
            <h2 className="text-lg font-semibold text-gray-900">Indicative Content</h2>
          </div>
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
      <div className="flex gap-6">
        {/* Your Answer Section */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Your Answer</h2>
              <div className="flex items-center space-x-1">
                <button
                  onClick={handleUndo}
                  disabled={undoStack.length <= 1}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo className="h-4 w-4" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={() => setIsFullscreen(true)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Fullscreen view"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
            <div className="flex space-x-3">
              {hasUnsavedChanges && (
                <button
                  onClick={handleSave}
                  disabled={isAutoSaving}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isAutoSaving ? 'Auto-saving...' : 'Save'}
                </button>
              )}
              {isAutoSaving && !hasUnsavedChanges && (
                <div className="flex items-center text-sm text-gray-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Auto-saving...
                </div>
              )}
              {lastAutoSave && !hasUnsavedChanges && !isAutoSaving && (
                <div className="text-sm text-green-600">
                  Auto-saved at {lastAutoSave.toLocaleTimeString()}
                </div>
              )}
              {content.trim() && (!answer || !answer.isGoodEnough) && (
                <button
                  onClick={handleRequestFeedback}
                  disabled={isRequestingFeedback}
                  className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {isRequestingFeedback ? 'Requesting...' : 'Request Feedback'}
                </button>
              )}
              {content.trim() && (!answer || !answer.isGoodEnough) && (
                <button
                  onClick={onMarkComplete}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Complete
                </button>
              )}
              {answer && answer.isGoodEnough && (
                <button
                  onClick={() => onMarkComplete()}
                  className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Mark Incomplete
                </button>
              )}
            </div>
          </div>
          
          <div className="h-64">
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={content}
              onChange={handleContentChange}
              modules={quillModules}
              formats={quillFormats}
              placeholder="Enter your answer here..."
              style={{ height: '200px' }}
            />
          </div>
          
          {answer && (
            <div className="mt-4 text-sm text-gray-600">
              <p>Last saved: {answer.lastModified.toLocaleString()}</p>
            {lastAutoSave && (
              <p>Last auto-save: {lastAutoSave.toLocaleString()}</p>
            )}
             {lastAutoSave && (
               <p>Last auto-save: {lastAutoSave.toLocaleString()}</p>
             )}
              <p>Version: {answer.version}</p>
            </div>
          )}
        </div>

        {/* Ask Assistant Section */}
        <div className={`bg-white rounded-xl shadow-sm border transition-all duration-300 ${
          showAskAssistant ? 'w-80' : 'w-16'
        }`}>
          {!showAskAssistant ? (
            /* Collapsed state - just icon */
            <div className="p-4 flex justify-center">
              <button
                onClick={() => setShowAskAssistant(true)}
                className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                title="Ask Assistant"
              >
                <HelpCircle className="h-6 w-6" />
              </button>
            </div>
          ) : (
            /* Expanded state - full content */
            <div className="p-6">
              <button
                onClick={() => setShowAskAssistant(false)}
                className="flex items-center justify-between w-full text-left mb-4"
              >
                <div className="flex items-center">
                  <HelpCircle className="h-5 w-5 text-purple-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Ask Assistant</h2>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-500" />
              </button>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="student-question" className="block text-sm font-medium text-gray-700 mb-2">
                    What would you like to ask?
                  </label>
                  <textarea
                    id="student-question"
                    value={studentQuestion}
                    onChange={(e) => setStudentQuestion(e.target.value)}
                    placeholder="Ask a question about this task, need clarification on requirements, or want help getting started..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                    rows={4}
                  />
                </div>
                
                <button
                  onClick={handleAskQuestion}
                  disabled={!studentQuestion.trim() || isAskingQuestion}
                  className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isAskingQuestion ? 'Asking...' : 'Ask Question'}
                </button>
                
                {/* Example Questions */}
                {exampleQuestions.length > 0 && !assistantResponse && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Quick Questions:</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {exampleQuestions.map((question, index) => (
                        <button
                          key={index}
                          onClick={() => handleExampleQuestionClick(question)}
                          className="w-full text-left text-xs text-gray-600 hover:text-purple-600 hover:bg-purple-50 p-2 rounded border border-gray-200 hover:border-purple-200 transition-colors"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {assistantResponse && (
                  <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-purple-900">Assistant Response:</h4>
                      {speechSupported && (
                        <button
                          onClick={() => handleSpeakResponse(assistantResponse.answer)}
                          className={`p-1 rounded transition-colors ${
                            isSpeaking 
                              ? 'text-red-600 hover:text-red-700 hover:bg-red-50' 
                              : 'text-purple-600 hover:text-purple-700 hover:bg-purple-100'
                          }`}
                          title={isSpeaking ? 'Stop reading' : 'Read aloud'}
                        >
                          {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                    <div className="text-sm text-purple-800 space-y-2">
                      <div className="whitespace-pre-line">
                        {assistantResponse.answer.replace(/(\d+[\).])/g, '\n$1').replace(/\n\s*\n\s*\n/g, '\n\n')}
                      </div>
                    </div>
                  </div>
                )}
                
                {assistantResponse && (
                  <button
                    onClick={() => {
                      setStudentQuestion('');
                      setAssistantResponse(null);
                    }}
                    className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Ask another question
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Section */}
      {answer?.feedback && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center mb-4">
            <MessageCircle className="h-6 w-6 text-orange-600 mr-3" />
            <h2 className="text-lg font-semibold text-gray-900">Feedback</h2>
          </div>
          <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
            {formatFeedback(answer.feedback)}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6">
        <button
          onClick={onNavigateBack}
          className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </button>
        
        {hasNext && (
          <button
            onClick={onNavigateNext}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </button>
        )}
      </div>
    </div>
  );
};