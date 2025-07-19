import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static('dist'));

// API endpoint to list storage files
app.get('/api/storage-files', async (req, res) => {
  try {
    const storageDir = path.join(__dirname, 'storage');
    
    // Check if storage directory exists
    try {
      await fs.access(storageDir);
    } catch {
      return res.json({ files: [] });
    }
    
    const files = await fs.readdir(storageDir);
    const jsonFiles = files
      .filter(file => file.endsWith('.json'))
      .map(async (file) => {
        const filePath = path.join(storageDir, file);
        const stats = await fs.stat(filePath);
        return {
          name: file,
          size: stats.size,
          modified: stats.mtime
        };
      });
    
    const fileDetails = await Promise.all(jsonFiles);
    res.json({ files: fileDetails });
  } catch (error) {
    console.error('Error listing storage files:', error);
    res.status(500).json({ error: 'Failed to list storage files' });
  }
});

// API endpoint to load progress from storage
app.get('/api/load-progress/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validate filename to prevent directory traversal
    if (!filename.endsWith('.json') || filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    const storageDir = path.join(__dirname, 'storage');
    const filePath = path.join(storageDir, filename);
    
    const content = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(content);
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error loading progress file:', error);
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'File not found' });
    } else {
      res.status(500).json({ error: 'Failed to load progress file' });
    }
  }
});

// API endpoint to save progress to storage folder
app.post('/api/save-progress', async (req, res) => {
  try {
    console.log('Received save progress request:', req.body);
    const { fileName, content } = req.body;
    
    if (!fileName || !content) {
      console.log('Missing fileName or content');
      return res.status(400).json({ error: 'fileName and content are required' });
    }
    
    // Validate fileName to prevent directory traversal
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    const storageDir = path.join(__dirname, 'storage');
    const filePath = path.join(storageDir, fileName);
    
    console.log('Saving to:', filePath);
    console.log('Storage directory:', storageDir);
    
    // Ensure storage directory exists
    try {
      await fs.mkdir(storageDir, { recursive: true });
      console.log('Storage directory created/verified');
    } catch (mkdirError) {
      console.error('Failed to create storage directory:', mkdirError);
      return res.status(500).json({ 
        error: 'Failed to create storage directory',
        details: mkdirError.message 
      });
    }
    
    // Write the file
    try {
      await fs.writeFile(filePath, content, 'utf8');
      console.log('File written successfully');
    } catch (writeError) {
      console.error('Failed to write file:', writeError);
      return res.status(500).json({ 
        error: 'Failed to write file',
        details: writeError.message 
      });
    }
    
    console.log('File saved successfully');
    res.json({ 
      success: true, 
      message: `Progress saved to storage/${fileName}`,
      fileName 
    });
  } catch (error) {
    console.error('Error saving progress:', error);
    res.status(500).json({ 
      error: 'Failed to save progress file',
      details: error.message 
    });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Storage folder: ${path.join(__dirname, 'storage')}`);
});