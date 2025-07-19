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

// API endpoint to save progress to storage folder
app.post('/api/save-progress', async (req, res) => {
  try {
    const { fileName, content } = req.body;
    
    if (!fileName || !content) {
      return res.status(400).json({ error: 'fileName and content are required' });
    }
    
    const storageDir = path.join(__dirname, 'storage');
    const filePath = path.join(storageDir, fileName);
    
    // Ensure storage directory exists
    await fs.mkdir(storageDir, { recursive: true });
    
    // Write the file
    await fs.writeFile(filePath, content, 'utf8');
    
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