import { UnitSummary } from '../types/Unit';

export interface ExportedProgress {
  exportDate: string;
  totalUnits: number;
  units: {
    [unitId: string]: {
      unitSummary: UnitSummary;
      progress: any;
    };
  };
}

export const exportAllProgress = (): ExportedProgress => {
  const unitListData = localStorage.getItem('learning-assistant-unit-list');
  const unitsData = localStorage.getItem('learning-assistant-units');
  
  if (!unitListData || !unitsData) {
    return {
      exportDate: new Date().toISOString(),
      totalUnits: 0,
      units: {}
    };
  }

  const unitList: UnitSummary[] = JSON.parse(unitListData);
  const exportData: ExportedProgress = {
    exportDate: new Date().toISOString(),
    totalUnits: unitList.length,
    units: {}
  };

  // Export progress for each unit
  unitList.forEach(unitSummary => {
    const progressKey = `learning-assistant-progress-${unitSummary.id}`;
    const progressData = localStorage.getItem(progressKey);
    
    exportData.units[unitSummary.id] = {
      unitSummary,
      progress: progressData ? JSON.parse(progressData) : null
    };
  });

  return exportData;
};

export const downloadProgressAsJson = () => {
  const exportData = exportAllProgress();
  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `learning-progress-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const saveProgressToStorage = async (exportData: ExportedProgress) => {
  const jsonString = JSON.stringify(exportData, null, 2);
  const filename = `learning-progress-${new Date().toISOString().split('T')[0]}.json`;
  
  // Save to localStorage with a special key for storage
  const storageKey = `learning-assistant-storage-${new Date().toISOString().split('T')[0]}`;
  localStorage.setItem(storageKey, jsonString);
  
  // Also save a list of all storage backups
  const storageListKey = 'learning-assistant-storage-list';
  const existingList = JSON.parse(localStorage.getItem(storageListKey) || '[]');
  const newBackup = {
    key: storageKey,
    filename,
    date: new Date().toISOString(),
    totalUnits: exportData.totalUnits
  };
  
  const updatedList = [...existingList.filter((item: any) => item.key !== storageKey), newBackup];
  localStorage.setItem(storageListKey, JSON.stringify(updatedList));
  
  return filename;
};

export const getStoredBackups = () => {
  const storageListKey = 'learning-assistant-storage-list';
  return JSON.parse(localStorage.getItem(storageListKey) || '[]');
};

export const loadFromStorage = (storageKey: string) => {
  return localStorage.getItem(storageKey);
};