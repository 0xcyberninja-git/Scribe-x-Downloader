import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'web-ui')));

// Utility to get the most recently created file in a directory
const getLatestFile = (dir) => {
    try {
        const files = fs.readdirSync(dir);
        if (files.length === 0) return null;
        let latestFile = null;
        let latestTime = 0;
        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);
            if (stats.mtimeMs > latestTime && stats.isFile()) {
                latestTime = stats.mtimeMs;
                latestFile = filePath;
            }
        });
        return latestFile;
    } catch (e) {
        return null;
    }
};

app.post('/api/download', async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`Starting real download for: ${url}`);
    
    // Capture the time before download to safely find the new file
    const startTime = Date.now();
    const outputDir = path.join(__dirname, 'output');
    
    // Ensure output dir exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    // Execute the scribd-dl script
    exec(`node run.js "${url}"`, { cwd: __dirname, env: Object.assign({}, process.env, { FORCE_COLOR: '1' }) }, (error, stdout, stderr) => {
        console.log("Process complete.", stdout, stderr);
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).json({ error: 'Download Failed', details: stderr || stdout || error.message });
        }

        // Try to identify the newly downloaded file
        const latestFile = getLatestFile(outputDir);
        
        let fileUrl = null;
        let filename = 'download';
        if (latestFile) {
            const stats = fs.statSync(latestFile);
            // Verify if the file was created during our process
            if (stats.mtimeMs >= startTime - 10000) {
                filename = path.basename(latestFile);
                fileUrl = `/output/${filename}`;
            }
        }

        if (fileUrl) {
            res.json({ success: true, fileUrl, filename, log: stdout });
        } else {
            res.status(500).json({ error: 'Could not locate downloaded file in output directory', log: stdout });
        }
    });
});

app.use('/output', express.static(path.join(__dirname, 'output')));

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`SCRIBEX Backend Server running openly on port ${PORT}`);
});
