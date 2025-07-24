import React, { useState } from 'react';
import { Unit } from '../types/Unit';
import { BookOpen, Target, Users, ChevronDown, ChevronRight, Clock } from 'lucide-react';

interface UnitOverviewProps {
  unit: Unit;
  onStartLearning: () => void;
}

export const UnitOverview: React.FC<UnitOverviewProps> = ({ unit, onStartLearning }) => {
  const [showInstructions, setShowInstructions] = useState(false);

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
            <span>Tasks: {unit.learning_outcomes.reduce((sum, lo) => sum + lo.outcome_tasks.length, 0)}</span>
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
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Scenario</h2>
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <p className="text-gray-800 leading-relaxed">{unit.scenario}</p>
        </div>
      </div>

      {/* Task */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Task</h2>
        <p className="text-gray-700 leading-relaxed">{unit.task}</p>
      </div>

      {/* Learning Outcomes Preview */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Learning Outcomes</h2>
        {unit.guided_learning_hours > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {unit.learning_outcomes.map((lo) => (
              <div key={lo.id} className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">{lo.title}</h3>
                {unit.credits > 0 && (
                  <p className="text-sm text-gray-600 mb-3">{lo.description}</p>
                )}
                <div className="text-xs text-gray-500">
                  {lo.outcome_tasks.length} task{lo.outcome_tasks.length !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions - Collapsed Section */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="flex items-center justify-between w-full text-left"
        >
          <h2 className="text-xl font-semibold text-gray-900">Instructions</h2>
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
          Start Learning
        </button>
      </div>
    </div>
  );
};