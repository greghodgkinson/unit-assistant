import { UnitSummary } from '../types/Unit';

export interface ExportedProgress {
  exportDate: string;
  totalUnits: number;
  units: {
    [unitId: string]: {
      unitSummary: UnitSummary;
      progress: any;
      unitData: any;
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
  const units = JSON.parse(unitsData);
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
      progress: progressData ? JSON.parse(progressData) : null,
      unitData: units[unitSummary.id] || null
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
  const fileSizeInBytes = new Blob([jsonString]).size;
  const maxSizeInBytes = 1024 * 1024; // 1MB limit
  
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
  
  try {
    console.log('Attempting to save to storage folder...');
    
    // If file is small enough, save as single file
    if (fileSizeInBytes <= maxSizeInBytes) {
      const fileName = `learning-progress-${timestamp}.json`;
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
    }
    
    // File is too large, save in chunks
    console.log(`File size (${(fileSizeInBytes / 1024 / 1024).toFixed(2)}MB) exceeds limit, saving in chunks...`);
    
    // Create metadata file
    const metadata = {
      originalFileName: `learning-progress-${timestamp}.json`,
      timestamp,
      totalUnits: exportData.totalUnits,
      exportDate: exportData.exportDate,
      isChunked: true,
      unitIds: Object.keys(exportData.units)
    };
    
    const metadataResponse = await fetch('/api/save-progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: `learning-progress-${timestamp}-metadata.json`,
        content: JSON.stringify(metadata, null, 2)
      })
    });
    
    if (!metadataResponse.ok) {
      throw new Error(`Failed to save metadata: ${metadataResponse.status}`);
    }
    
    // Save each unit separately
    const savedChunks = [];
    for (const [unitId, unitData] of Object.entries(exportData.units)) {
      const chunkData = {
        exportDate: exportData.exportDate,
        totalUnits: 1,
        units: { [unitId]: unitData }
      };
      
      const chunkFileName = `learning-progress-${timestamp}-unit-${unitId}.json`;
      const chunkResponse = await fetch('/api/save-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: chunkFileName,
          content: JSON.stringify(chunkData, null, 2)
        })
      });
      
      if (!chunkResponse.ok) {
        throw new Error(`Failed to save unit ${unitId}: ${chunkResponse.status}`);
      }
      
      savedChunks.push(chunkFileName);
      console.log(`Saved chunk: ${chunkFileName}`);
    }
    
    console.log('All chunks saved successfully');
    return {
      success: true,
      message: `Progress saved in ${savedChunks.length + 1} files (chunked due to size)`,
      fileName: `learning-progress-${timestamp}-metadata.json`,
      chunks: savedChunks
    };
    
  } catch (error) {
    console.error('Error saving to storage folder:', error);
    if (error.message.includes('fetch') || error.message.includes('Failed to fetch') || error.name === 'TypeError') {
      throw new Error('Backend server not running. Please open a second terminal and run "npm run server" to start the Express server, then try again.');
    }
    throw error;
  }
};
export interface StorageFile {
  name: string;
  size: number;
  modified: Date;
  preview?: {
    totalUnits: number;
    totalTasks: number;
    completedTasks: number;
    progressPercentage: number;
  };
}

export const getStorageFiles = async (): Promise<StorageFile[]> => {
  try {
    const response = await fetch('/api/storage-files');
    
    // Check if we got HTML instead of JSON (API not available)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('Storage API not available - returning empty file list');
      return [];
    }
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn('Storage endpoint not found - returning empty file list');
        return [];
      }
      throw new Error(`Failed to fetch storage files: ${response.status}`);
    }
    
    const data = await response.json();
    const allFiles = data.files.map((file: any) => ({
      ...file,
      modified: new Date(file.modified)
    }));
    
    // Filter out chunk files and metadata files, only show main progress files
    const progressFiles = allFiles.filter((file: StorageFile) => {
      // Skip chunk files (contain "-unit-" in the name)
      if (file.name.includes('-unit-') && file.name.includes('learning-progress-')) {
        return false;
      }
      // Skip metadata files
      if (file.name.includes('-metadata.json')) {
        return false;
      }
      // Skip settings files
      if (file.name === 'settings.json') {
        return false;
      }
      // Only include learning progress files
      return file.name.startsWith('learning-progress-') && file.name.endsWith('.json');
    });
    
    return progressFiles;
  } catch (error) {
    if (error.name === 'TypeError' || error.message.includes('fetch')) {
      console.warn('Backend server not running - returning empty file list');
    } else {
      console.warn('Error fetching storage files, returning empty list:', error);
    }
    return []; // Return empty array instead of throwing
  }
};

export const loadProgressFromStorage = async (filename: string): Promise<ExportedProgress> => {
  try {
    // Check if this might be a chunked file by looking for metadata
    const metadataFilename = filename.replace('.json', '-metadata.json');
    
    // Try to load metadata first
    let metadataResponse;
    try {
      metadataResponse = await fetch(`/api/load-progress/${encodeURIComponent(metadataFilename)}`);
    } catch (error) {
      // Metadata doesn't exist, treat as regular file
      metadataResponse = null;
    }
    
    if (metadataResponse && metadataResponse.ok) {
      // This is a chunked file, load all chunks
      console.log('Loading chunked progress file...');
      const metadataResult = await metadataResponse.json();
      const metadata = metadataResult.data;
      
      if (!metadata.isChunked || !metadata.unitIds) {
        throw new Error('Invalid metadata format');
      }
      
      // Load all unit chunks
      const units: Record<string, any> = {};
      const timestamp = metadata.timestamp;
      
      for (const unitId of metadata.unitIds) {
        const chunkFilename = `learning-progress-${timestamp}-unit-${unitId}.json`;
        const chunkResponse = await fetch(`/api/load-progress/${encodeURIComponent(chunkFilename)}`);
        
        if (!chunkResponse.ok) {
          throw new Error(`Failed to load chunk for unit ${unitId}: ${chunkResponse.status}`);
        }
        
        const chunkResult = await chunkResponse.json();
        const chunkData = chunkResult.data;
        
        // Merge the unit data
        Object.assign(units, chunkData.units);
      }
      
      // Reconstruct the full progress data
      const reconstructedData: ExportedProgress = {
        exportDate: metadata.exportDate,
        totalUnits: metadata.totalUnits,
        units
      };
      
      console.log('Successfully loaded chunked progress file');
      return reconstructedData;
    } else {
      // Regular single file
      const response = await fetch(`/api/load-progress/${encodeURIComponent(filename)}`);
      if (!response.ok) {
        throw new Error(`Failed to load progress file: ${response.status}`);
      }
      const result = await response.json();
      return result.data;
    }
  } catch (error) {
    console.error('Error loading progress from storage:', error);
    throw error;
  }
};

export const importProgress = (progressData: ExportedProgress) => {
  try {
    console.log('Importing progress data:', progressData);
    
    // Import unit list
    const unitList = Object.values(progressData.units).map(unit => unit.unitSummary);
    console.log('Importing unit list:', unitList);
    localStorage.setItem('learning-assistant-unit-list', JSON.stringify(unitList));
    
    // Import units data
    const units: Record<string, any> = {};
    Object.entries(progressData.units).forEach(([unitId, unitData]) => {
      if (unitData.unitData) {
        units[unitId] = unitData.unitData;
      }
    });
    console.log('Importing units data:', units);
    localStorage.setItem('learning-assistant-units', JSON.stringify(units));
    
    // Import progress for each unit and sync completed tasks count
    const updatedUnitList = unitList.map(unitSummary => {
      const unitProgress = progressData.units[unitSummary.id]?.progress;
      if (unitProgress && unitProgress.completedTasks) {
        return {
          ...unitSummary,
          completedTasks: unitProgress.completedTasks.length
        };
      }
      return unitSummary;
    });
    
    // Update unit list with correct completed tasks count
    localStorage.setItem('learning-assistant-unit-list', JSON.stringify(updatedUnitList));
    
    // Import progress for each unit
    Object.entries(progressData.units).forEach(([unitId, unitData]) => {
      if (unitData.progress) {
        const progressKey = `learning-assistant-progress-${unitId}`;
        console.log(`Importing progress for ${unitId}:`, unitData.progress);
        localStorage.setItem(progressKey, JSON.stringify(unitData.progress));
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error importing progress:', error);
    throw error;
  }
};
