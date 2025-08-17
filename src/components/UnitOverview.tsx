import React, { useState } from 'react';
import { Unit } from '../types/Unit';
import { BookOpen, Target, Users, ChevronDown, ChevronRight, Clock, MapPin, CheckSquare, Lightbulb, FileText, Play } from 'lucide-react';

interface UnitOverviewProps {
  unit: Unit;
  onStartLearning: () => void;
}

function SmartScenarioInline({ text }: { text?: string }) {
  if (!text) return null;

  // Normalize newlines
  let t = text.replace(/\r\n?/g, "\n");

  // Force bullets (only if they start a line)
  t = t
    .replace(/(^|\n)\s*(Firstly|Secondly|Thirdly)\b/gi, "\n$2")
    .replace(/(^|\n)\s*[•]\s+/g, "\n• ")
    .replace(/(^|\n)\s*-\s+/g, "\n- "); // only dash at line start

  // If a bullet line has extra trailing sentence → split
  t = t.replace(/([.!?])\s+([A-Z])/g, "$1\n$2");

  // Collapse multiple newlines
  t = t.replace(/\n{3,}/g, "\n\n").trim();

  return (
    <div className="text-gray-800 leading-relaxed whitespace-pre-line">
      {t}
    </div>
  );
}


export const UnitOverview: React.FC<UnitOverviewProps> = ({ unit, onStartLearning }) => {
  const [showInstructions, setShowInstructions] = useState(false);

  // Calculate unique tasks across all learning outcomes
  const getUniqueTaskCount = () => {
    const allTaskIds = new Set<string>();
    unit.learning_outcomes.forEach(lo => {
      lo.outcome_tasks.forEach(task => {
        allTaskIds.add(task.id);
      });
    });
    return allTaskIds.size;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-8">
        <h1 className="text-3xl font-bold mb-4">{unit.title}</h1>
        <div className="flex items-center space-x-6">
          <div className="flex items-center">
            <BookOpen className="h-6 w-6 mr-2" />
            <span>Learning Outcomes: {unit.learning_outcomes.length}</span>
          </div>
          <div className="flex items-center">
            <Target className="h-6 w-6 mr-2" />
            <span>Tasks: {getUniqueTaskCount()}</span>
          </div>
          <div className="flex items-center">
            <Users className="h-6 w-6 mr-2" />
            <span>Credits: {unit.credits || 0}</span>
          </div>
          <div className="flex items-center">
            <Clock className="h-6 w-6 mr-2" />
            <span>Guided Hours: {unit.guided_learning_hours || 0}</span>
          </div>
          <div className="flex items-center">
            <BookOpen className="h-6 w-6 mr-2" />
            <span>Internship Program</span>
          </div>
        </div>
      </div>

      {/* Scenario */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center mb-4">
          <MapPin className="h-6 w-6 text-blue-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">Scenario</h2>
        </div>
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <SmartScenarioInline text={unit.scenario} />
        </div>
      </div>

      {/* Task */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center mb-4">
          <CheckSquare className="h-6 w-6 text-green-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">Your Task</h2>
        </div>
        <p className="text-gray-700 leading-relaxed">{unit.task}</p>
      </div>

      {/* Learning Outcomes Preview */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center mb-4">
          <Lightbulb className="h-6 w-6 text-yellow-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">Learning Outcomes</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {unit.learning_outcomes.map((lo) => (
            <div key={lo.id} className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">{lo.id}</h3>
              <p className="text-sm text-gray-600 mb-3">{lo.description}</p>
              <div className="flex items-center text-xs text-gray-500">
                <CheckSquare className="h-3 w-3 mr-1" />
                {lo.outcome_tasks.length} task{lo.outcome_tasks.length !== 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions - Collapsed Section */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center">
            <FileText className="h-6 w-6 text-purple-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Instructions</h2>
          </div>
          {showInstructions ? (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-500" />
          )}
        </button>
        
        {showInstructions && (
          <div className="mt-4 prose prose-gray max-w-none">
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{unit.instructions}</p>
          </div>
        )}
      </div>

      {/* Start Button */}
      <div className="flex justify-center pt-6">
        <button
          onClick={onStartLearning}
          className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg"
        >
          <Play className="h-6 w-6 mr-3 inline" />
          Start Learning
        </button>
      </div>
    </div>
  );
};