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

export const saveProgressToStorageFolder = async () => {
  const exportData = exportAllProgress();
  const jsonString = JSON.stringify(exportData, null, 2);
  const fileName = `learning-progress-${new Date().toISOString().split('T')[0]}.json`;
  
  try {
    // Save to storage folder in the app
    const response = await fetch('/api/save-progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName,
        content: jsonString
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save to storage folder');
    }
    
    return { success: true, fileName };
  } catch (error) {
    console.error('Error saving to storage folder:', error);
    throw error;
  }
};