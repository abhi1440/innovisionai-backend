import express from 'express';
import { listFilesFromFolder } from '../utils/googleDrive.js';

const router = express.Router();

router.get('/get-images/:folderId', async(req, res) => {
    const { folderId } = req.params;

    try {
        const files = await listFilesFromFolder(folderId);

        const imageFiles = files
            .filter(file => file.mimeType.startsWith('image/'))
            .map(file => ({
                name: file.name,
                id: file.id,
                url: `https://drive.google.com/uc?export=view&id=${file.id}`,
            }));

        res.status(200).json({ images: imageFiles });
    } catch (err) {
        console.error("❌ Failed to fetch files:", err.message);
        res.status(500).json({ error: 'Failed to fetch images from Google Drive' });
    }
});

export default router;