import { useState, useEffect } from 'react';
import { Unit, UnitSummary } from '../types/Unit';

const UNITS_STORAGE_KEY = 'learning-assistant-units';
const UNIT_LIST_STORAGE_KEY = 'learning-assistant-unit-list';

export const useUnitManager = () => {
  const [units, setUnits] = useState<Record<string, Unit>>({});
  const [unitList, setUnitList] = useState<UnitSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load units and unit list from localStorage
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load existing units from localStorage
        const savedUnits = localStorage.getItem(UNITS_STORAGE_KEY);
        const savedUnitList = localStorage.getItem(UNIT_LIST_STORAGE_KEY);

        let loadedUnits: Record<string, Unit> = {};
        let loadedUnitList: UnitSummary[] = [];

        if (savedUnits && savedUnitList) {
          loadedUnits = JSON.parse(savedUnits);
          loadedUnitList = JSON.parse(savedUnitList).map((unit: any) => ({
            ...unit,
            lastActivity: unit.lastActivity ? new Date(unit.lastActivity) : undefined,
            dateAdded: new Date(unit.dateAdded)
          }));
          
          // Add default values for missing fields in existing units
          Object.keys(loadedUnits).forEach(unitId => {
            const unit = loadedUnits[unitId];
            if (unit.credits === undefined) {
              unit.credits = 0;
            }
            if (unit.guided_learning_hours === undefined) {
              unit.guided_learning_hours = 0;
            }
          });
        }

        console.log('Loaded units from storage:', loadedUnits);
        console.log('Loaded unit list from storage:', loadedUnitList);

        setUnits(loadedUnits);
        setUnitList(loadedUnitList);
      } catch (err) {
        setError('Failed to load units');
        console.error('Error loading units:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []); // Keep dependency array empty to only run on mount

  // Save to localStorage whenever units or unitList changes
  useEffect(() => {
    if (!loading) {
      localStorage.setItem(UNITS_STORAGE_KEY, JSON.stringify(units));
      localStorage.setItem(UNIT_LIST_STORAGE_KEY, JSON.stringify(unitList));
    }
  }, [units, unitList, loading]);

  const addUnit = (unit: Unit) => {
    const totalTasks = unit.learning_outcomes.reduce((sum, lo) => sum + lo.outcome_tasks.length, 0);
    
    // Ensure backwards compatibility by adding default values for missing fields
    const unitWithDefaults: Unit = {
      ...unit,
      credits: unit.credits ?? 0,
      guided_learning_hours: unit.guided_learning_hours ?? 0
    };
    
    const unitSummary: UnitSummary = {
      id: unitWithDefaults.id,
      title: unitWithDefaults.title,
      totalTasks,
      completedTasks: 0,
      dateAdded: new Date()
    };

    setUnits(prev => ({ ...prev, [unitWithDefaults.id]: unitWithDefaults }));
    setUnitList(prev => {
      const existing = prev.find(u => u.id === unitWithDefaults.id);
      if (existing) {
        return prev.map(u => u.id === unitWithDefaults.id ? unitSummary : u);
      }
      return [...prev, unitSummary];
    });
  };

  const removeUnit = (unitId: string) => {
    setUnits(prev => {
      const newUnits = { ...prev };
      delete newUnits[unitId];
      return newUnits;
    });
    setUnitList(prev => prev.filter(u => u.id !== unitId));
    
    // Also remove progress data for this unit
    const progressKey = `learning-assistant-progress-${unitId}`;
    localStorage.removeItem(progressKey);
  };

  const getUnit = (unitId: string): Unit | null => {
    return units[unitId] || null;
  };

  const updateUnitProgress = (unitId: string, completedTasks: number) => {
    setUnitList(prev => prev.map(unit => 
      unit.id === unitId 
        ? { ...unit, completedTasks, lastActivity: new Date() }
        : unit
    ));
  };

  return {
    units,
    unitList,
    loading,
    error,
    addUnit,
    removeUnit,
    getUnit,
    updateUnitProgress
  };
};