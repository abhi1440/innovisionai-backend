// import express from 'express';
// import { listFilesFromFolder } from '../utils/googleDrive.js';

// const router = express.Router();

// router.get('/get-images/:folderId', async(req, res) => {
//     const { folderId } = req.params;

//     try {
//         const files = await listFilesFromFolder(folderId);

//         const imageFiles = files
//             .filter(file => file.mimeType.startsWith('image/'))
//             .map(file => ({
//                 name: file.name,
//                 id: file.id,
//                 url: `https://drive.google.com/uc?export=view&id=${file.id}`,
//             }));

//         res.status(200).json({ images: imageFiles });
//     } catch (err) {
//         console.error("❌ Failed to fetch files:", err.message);
//         res.status(500).json({ error: 'Failed to fetch images from Google Drive' });
//     }
// });

// export default router;


import express from 'express';
import { authorizeDrive } from '../utils/googleDrive.js';
import archiver from 'archiver';

const router = express.Router();

let drive;

router.use(async(req, res, next) => {
    if (!drive) {
        try {
            drive = await authorizeDrive();
        } catch (err) {
            console.error("❌ Google Drive auth error:", err.message);
            return res.status(500).json({ error: "Failed to authorize Google Drive" });
        }
    }
    next();
});

// Existing GET route: get images from folder (optional for your use)
router.get('/get-images/:folderId', async(req, res) => {
    const { folderId } = req.params;
    try {
        const files = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`,
            fields: 'files(id, name, mimeType)',
            pageSize: 1000,
        });

        // Remove duplicates by id
        const uniqueMap = new Map();
        for (const file of files.data.files) {
            if (!uniqueMap.has(file.id)) {
                uniqueMap.set(file.id, {
                    id: file.id,
                    name: file.name,
                    webViewLink: `https://drive.google.com/file/d/${file.id}/view`,
                    webContentLink: `https://drive.google.com/uc?id=${file.id}`,
                });
            }
        }

        res.status(200).json({ images: Array.from(uniqueMap.values()) });
    } catch (err) {
        console.error("❌ Failed to fetch images:", err.message);
        res.status(500).json({ error: 'Failed to fetch images from Google Drive' });
    }
});

// New POST route: download only selected files as ZIP
router.post('/download-zip', async(req, res) => {
    const { fileIds } = req.body;

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({ error: "No file IDs provided" });
    }

    try {
        res.setHeader('Content-Disposition', 'attachment; filename=sorted-images.zip');
        res.setHeader('Content-Type', 'application/zip');

        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.pipe(res);

        for (const fileId of fileIds) {
            // Get file metadata (name)
            const fileMeta = await drive.files.get({
                fileId,
                fields: 'name',
            });

            // Get file stream
            const fileStream = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });

            archive.append(fileStream.data, { name: fileMeta.data.name || `${fileId}.jpg` });
        }

        await archive.finalize();

    } catch (err) {
        console.error('ZIP download error:', err.message);
        res.status(500).json({ error: 'Failed to generate ZIP file' });
    }
});

export default router;