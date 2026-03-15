import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, MessageCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { UnitSummary, TaskStatus, StudentAnswer } from '../types/Unit';
import { getTimestampForStatus, getLatestTimestampForStatus } from '../utils/taskStatus';

interface OverallProgressProps {
  units: UnitSummary[];
  getUnit: (unitId: string) => any;
  onBack: () => void;
  onSubmitUnit: (unitId: string) => void;
  onTaskSelect: (unitId: string, loId: string, taskId: string) => void;
  onRecordOutcome: (unitId: string, taskId: string, outcome: 'achieved' | 'not-yet-achieved', reviewFeedback?: string) => void;
}

const STATUS_COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'in-progress',          label: 'In Progress',      color: 'bg-yellow-500' },
  { status: 'completed',            label: 'Completed',        color: 'bg-blue-500'   },
  { status: 'submitted-for-review', label: 'Submitted',        color: 'bg-purple-500' },
  { status: 'not-yet-achieved',     label: 'Not Yet Achieved', color: 'bg-orange-500' },
  { status: 'achieved',             label: 'Achieved',         color: 'bg-green-600'  },
];

interface TaskRow {
  unitId: string;
  unitTitle: string;
  loId: string;
  taskId: string;
  description: string;
  answer?: StudentAnswer;
}

export const OverallProgress: React.FC<OverallProgressProps> = ({ units, getUnit, onBack, onSubmitUnit, onTaskSelect, onRecordOutcome }) => {
  const [activeOutcomeKey, setActiveOutcomeKey] = useState<string | null>(null); // "unitId:taskId"
  const [showFeedbackFor, setShowFeedbackFor] = useState<string | null>(null);   // "unitId:taskId"
  const [feedbackInput, setFeedbackInput] = useState('');
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());

  const toggleUnit = (unitId: string) => {
    setExpandedUnits(prev => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId); else next.add(unitId);
      return next;
    });
  };

  const outcomeKey = (unitId: string, taskId: string) => `${unitId}:${taskId}`;
  // Build task rows across all units
  const taskRows: TaskRow[] = [];

  units.forEach(unitSummary => {
    const unit = getUnit(unitSummary.id);
    if (!unit) return;

    const progressData = localStorage.getItem(`learning-assistant-progress-${unitSummary.id}`);
    const rawProgress = progressData ? JSON.parse(progressData) : null;

    // Deserialise dates in statusHistory
    const answers: StudentAnswer[] = (rawProgress?.answers || []).map((a: any) => ({
      ...a,
      submissionDate: new Date(a.submissionDate),
      lastModified: new Date(a.lastModified),
      statusHistory: (a.statusHistory || []).map((c: any) => ({
        ...c,
        timestamp: new Date(c.timestamp),
      })),
    }));

    // Deduplicate tasks — each task shown under the last LO it appears in
    const taskToLastLO = new Map<string, string>();
    unit.learning_outcomes.forEach((lo: any) => {
      lo.outcome_tasks.forEach((task: any) => {
        taskToLastLO.set(task.id, lo.id);
      });
    });

    const seen = new Set<string>();
    unit.learning_outcomes.forEach((lo: any) => {
      lo.outcome_tasks.forEach((task: any) => {
        if (!seen.has(task.id) && taskToLastLO.get(task.id) === lo.id) {
          seen.add(task.id);
          taskRows.push({
            unitId: unitSummary.id,
            unitTitle: unitSummary.title,
            loId: lo.id,
            taskId: task.id,
            description: task.description,
            answer: answers.find((a: StudentAnswer) => a.taskId === task.id),
          });
        }
      });
    });
  });

  const totalTasks = taskRows.length;
  const achievedCount = taskRows.filter(r => {
    const history = r.answer?.statusHistory || [];
    return history.some(c => c.status === 'achieved');
  }).length;
  const submittedCount = taskRows.filter(r => {
    const history = r.answer?.statusHistory || [];
    return history.some(c => c.status === 'submitted-for-review');
  }).length;

  // Derive current status per task (top-level, shared with summary)
  const deriveLastStatus = (r: TaskRow): TaskStatus => {
    const history = r.answer?.statusHistory || [];
    if (history.length > 0) return history[history.length - 1].status as TaskStatus;
    if (r.answer?.isGoodEnough) return 'completed';
    if (r.answer) return 'in-progress';
    return 'not-started';
  };

  const statusSummary = STATUS_COLUMNS.map(col => {
    const count = taskRows.filter(r => deriveLastStatus(r) === col.status).length;
    const pct = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
    return { ...col, count, pct };
  });
  const notStartedCount = taskRows.filter(r => deriveLastStatus(r) === 'not-started').length;
  const notStartedPct = totalTasks > 0 ? Math.round((notStartedCount / totalTasks) * 100) : 0;

  // Group rows by unit for display
  const unitIds = [...new Set(taskRows.map(r => r.unitId))];

  return (
    <div className="space-y-6">
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
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Overall Progress</h1>
          <p className="text-sm text-gray-500 mt-1">{totalTasks} tasks across {unitIds.length} unit{unitIds.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-gray-700">{notStartedCount}</p>
            <p className="text-xs text-gray-500 font-medium">{notStartedPct}%</p>
            <p className="text-xs text-gray-500 mt-0.5">Not Started</p>
          </div>
          {statusSummary.map(s => (
            <div key={s.status} className={`rounded-lg p-3 text-center border ${
              s.status === 'achieved'             ? 'bg-green-50 border-green-200' :
              s.status === 'not-yet-achieved'     ? 'bg-orange-50 border-orange-200' :
              s.status === 'submitted-for-review' ? 'bg-purple-50 border-purple-200' :
              s.status === 'completed'            ? 'bg-blue-50 border-blue-200' :
                                                    'bg-yellow-50 border-yellow-200'
            }`}>
              <p className={`text-xl font-bold ${
                s.status === 'achieved'             ? 'text-green-700' :
                s.status === 'not-yet-achieved'     ? 'text-orange-700' :
                s.status === 'submitted-for-review' ? 'text-purple-700' :
                s.status === 'completed'            ? 'text-blue-700' :
                                                      'text-yellow-700'
              }`}>{s.count}</p>
              <p className="text-xs text-gray-500 font-medium">{s.pct}%</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Matrix per unit */}
      {unitIds.map(unitId => {
        const rows = taskRows.filter(r => r.unitId === unitId);
        const unitTitle = rows[0]?.unitTitle || unitId;

        const getLastStatus = (r: TaskRow) => {
          const history = r.answer?.statusHistory || [];
          if (history.length > 0) return history[history.length - 1].status;
          if (r.answer?.isGoodEnough) return 'completed';
          if (r.answer) return 'in-progress';
          return 'not-started';
        };

        const allTasksDone = rows.every(r =>
          ['completed', 'submitted-for-review', 'not-yet-achieved', 'achieved'].includes(getLastStatus(r))
        );
        const hasUnsubmitted = rows.some(r => getLastStatus(r) === 'completed');
        const canSubmit = allTasksDone && hasUnsubmitted;

        const getUnitStatus = (): { label: string; className: string } => {
          const statuses = rows.map(r => getLastStatus(r));
          if (statuses.every(s => s === 'achieved'))
            return { label: 'Achieved', className: 'bg-green-100 text-green-800 border-green-300' };
          if (statuses.some(s => s === 'not-yet-achieved'))
            return { label: 'Feedback Received', className: 'bg-orange-100 text-orange-800 border-orange-300' };
          if (statuses.every(s => s === 'submitted-for-review' || s === 'achieved'))
            return { label: 'Submitted for Review', className: 'bg-purple-100 text-purple-800 border-purple-300' };
          if (canSubmit)
            return { label: 'Ready to Submit', className: 'bg-blue-100 text-blue-800 border-blue-300' };
          if (statuses.some(s => s !== 'not-started'))
            return { label: 'In Progress', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
          return { label: 'Not Started', className: 'bg-gray-100 text-gray-600 border-gray-300' };
        };

        const unitStatus = getUnitStatus();

        const isExpanded = expandedUnits.has(unitId);

        return (
          <div key={unitId} className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div
              className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => toggleUnit(unitId)}
            >
              <div className="flex items-center space-x-3">
                {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                <h2 className="font-semibold text-gray-800">{unitTitle}</h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${unitStatus.className}`}>
                  {unitStatus.label}
                </span>
                <span className="text-xs text-gray-400">{rows.length} task{rows.length !== 1 ? 's' : ''}</span>
              </div>
              {canSubmit && (
                <button
                  onClick={e => { e.stopPropagation(); onSubmitUnit(unitId); }}
                  className="flex items-center px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Submit for Review
                </button>
              )}
            </div>
            {isExpanded && <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/50">
                    <th className="text-left p-3 font-semibold text-gray-700 w-20">Task</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Description</th>
                    {STATUS_COLUMNS.map(col => (
                      <th key={col.status} className="p-3 font-semibold text-gray-700 text-center whitespace-nowrap min-w-[110px]">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr
                      key={row.taskId}
                      onClick={() => onTaskSelect(row.unitId, row.loId, row.taskId)}
                      className={`border-b cursor-pointer transition-colors hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
                    >
                      <td className="p-3 font-semibold text-gray-900">{row.taskId}</td>
                      <td className="p-3 text-gray-600 max-w-xs">
                        <span className="line-clamp-2 text-xs">{row.description}</span>
                      </td>
                      {STATUS_COLUMNS.map(col => {
                        const currentStatus = getLastStatus(row);
                        // For submitted/not-yet-achieved use the latest occurrence; others use first
                        const usesLatest = col.status === 'submitted-for-review' || col.status === 'not-yet-achieved';
                        const ts = usesLatest
                          ? getLatestTimestampForStatus(row.answer, col.status)
                          : getTimestampForStatus(row.answer, col.status);
                        const reached = !!ts;

                        // Stale = part of a review cycle superseded by a later re-completion
                        const latestCompletedTs = getLatestTimestampForStatus(row.answer, 'completed');
                        const cycleStale = usesLatest && !!ts && !!latestCompletedTs && ts < latestCompletedTs;
                        // Grey out completed cell only while in not-yet-achieved (answer invalidated, not yet revised)
                        const completedStale = col.status === 'completed' && currentStatus === 'not-yet-achieved';
                        const isStale = cycleStale || completedStale;
                        const isActionable = col.status === 'submitted-for-review' && currentStatus === 'submitted-for-review';
                        const key = outcomeKey(row.unitId, row.taskId);
                        const isActive = activeOutcomeKey === key;
                        const isFeedbackOpen = showFeedbackFor === key;

                        return (
                          <td
                            key={col.status}
                            className="p-2 text-center align-top"
                            onClick={isActionable ? e => { e.stopPropagation(); setActiveOutcomeKey(isActive ? null : key); setShowFeedbackFor(null); setFeedbackInput(''); } : undefined}
                          >
                            {reached ? (
                              isStale ? (
                                <div className="bg-gray-300 rounded-lg p-2 mx-1 opacity-50">
                                  <p className="text-gray-600 text-xs font-medium leading-tight line-through">
                                    {ts.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                  </p>
                                  <p className="text-gray-500 text-xs">
                                    {ts.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              ) : (
                                <div className={`${col.color} rounded-lg p-2 mx-1 ${isActionable ? 'cursor-pointer hover:opacity-80' : ''}`}>
                                  <p className="text-white text-xs font-medium leading-tight">
                                    {ts.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                  </p>
                                  <p className="text-white/80 text-xs">
                                    {ts.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                  {isActionable && <p className="text-white/70 text-xs mt-1">click to record outcome</p>}
                                </div>
                              )
                            ) : (
                              <div className="bg-gray-100 rounded-lg p-2 mx-1 h-[44px]" />
                            )}

                            {/* Outcome panel */}
                            {isActionable && isActive && !isFeedbackOpen && (
                              <div className="mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 space-y-1 text-left" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => setShowFeedbackFor(key)}
                                  className="w-full flex items-center px-2 py-1.5 text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded hover:bg-orange-100 transition-colors"
                                >
                                  <MessageCircle className="h-3 w-3 mr-1.5 flex-shrink-0" />
                                  Not Yet Achieved
                                </button>
                                <button
                                  onClick={() => { onRecordOutcome(row.unitId, row.taskId, 'achieved'); setActiveOutcomeKey(null); }}
                                  className="w-full flex items-center px-2 py-1.5 text-xs bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 transition-colors"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1.5 flex-shrink-0" />
                                  Achieved
                                </button>
                              </div>
                            )}

                            {/* Feedback input */}
                            {isActionable && isFeedbackOpen && (
                              <div className="mt-1 bg-white border border-orange-200 rounded-lg shadow-lg p-3 text-left w-80" onClick={e => e.stopPropagation()}>
                                <p className="text-xs font-medium text-orange-800 mb-2">Feedback received:</p>
                                <textarea
                                  autoFocus
                                  value={feedbackInput}
                                  onChange={e => setFeedbackInput(e.target.value)}
                                  className="w-full p-2 text-sm border border-orange-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-orange-400"
                                  rows={8}
                                  placeholder="Enter feedback notes..."
                                />
                                <div className="flex space-x-1 mt-1">
                                  <button
                                    onClick={() => { onRecordOutcome(row.unitId, row.taskId, 'not-yet-achieved', feedbackInput); setActiveOutcomeKey(null); setShowFeedbackFor(null); setFeedbackInput(''); }}
                                    className="flex-1 px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => { setShowFeedbackFor(null); setFeedbackInput(''); }}
                                    className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                                  >
                                    Back
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
          </div>
        );
      })}

      {taskRows.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-500">
          No units loaded yet. Add a unit to see progress here.
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-600">
        {STATUS_COLUMNS.map(col => (
          <div key={col.status} className="flex items-center space-x-1">
            <div className={`w-3 h-3 rounded ${col.color}`} />
            <span>{col.label}</span>
          </div>
        ))}
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded bg-gray-200" />
          <span>Not reached</span>
        </div>
      </div>
    </div>
  );
};
