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
  
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5); // Remove milliseconds and replace colons/dots
  const link = document.createElement('a');
  link.href = url;
  link.download = `learning-progress-${timestamp}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const saveProgressToStorageFolder = async () => {
  const exportData = exportAllProgress();
  const jsonString = JSON.stringify(exportData, null, 2);
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5); // Remove milliseconds and replace colons/dots
  const fileName = `learning-progress-${timestamp}.json`;
  
  try {
    console.log('Attempting to save to storage folder...');
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
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Server response:', errorData);
      throw new Error(`Server error: ${response.status} - ${errorData}`);
    }
    
    const result = await response.json();
    console.log('Save successful:', result);
    return result;
  } catch (error) {
    console.error('Error saving to storage folder:', error);
    throw error;
  }
};
export interface StorageFile {
  name: string;
  size: number;
  modified: Date;
}

export const getStorageFiles = async (): Promise<StorageFile[]> => {
  try {
    const response = await fetch('/api/storage-files');
    if (!response.ok) {
      throw new Error(`Failed to fetch storage files: ${response.status}`);
    }
    const data = await response.json();
    return data.files.map((file: any) => ({
      ...file,
      modified: new Date(file.modified)
    }));
  } catch (error) {
    console.error('Error fetching storage files:', error);
    throw error;
  }
};

export const loadProgressFromStorage = async (filename: string): Promise<ExportedProgress> => {
  try {
    const response = await fetch(`/api/load-progress/${encodeURIComponent(filename)}`);
    if (!response.ok) {
      throw new Error(`Failed to load progress file: ${response.status}`);
    }
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error loading progress from storage:', error);
    throw error;
  }
};

export const importProgress = (progressData: ExportedProgress) => {
  try {
    // Import unit list
    const unitList = Object.values(progressData.units).map(unit => unit.unitSummary);
    localStorage.setItem('learning-assistant-unit-list', JSON.stringify(unitList));
    
    // Import units data (we'll need to reconstruct this from the progress data)
    // For now, we'll just clear it since we don't have the full unit data in the export
    localStorage.setItem('learning-assistant-units', JSON.stringify({}));
    
    // Import progress for each unit
    Object.entries(progressData.units).forEach(([unitId, unitData]) => {
      if (unitData.progress) {
        const progressKey = `learning-assistant-progress-${unitId}`;
        localStorage.setItem(progressKey, JSON.stringify(unitData.progress));
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error importing progress:', error);
    throw error;
  }
};
