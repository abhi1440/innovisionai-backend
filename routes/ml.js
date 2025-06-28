// backend/routes/ml.js
import express from 'express';
import axios from 'axios';
import multer from 'multer';
import FormData from 'form-data';
import { updateCredits } from '../utils/creditManager.js';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 🟦 Step 1: Upload ZIP folder of photos
router.post('/upload-photos', upload.single('file'), async(req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No ZIP file uploaded' });

        const email = req.user?.emails?.[0]?.value || req.session.email;
        if (!email) return res.status(401).json({ error: "Unauthorized" });

        // ✅ Check ZIP credits
        await updateCredits(email, 'zip');

        const formData = new FormData();
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname || 'photos.zip',
            contentType: 'application/zip',
        });
        formData.append('username', 'bob');

        const response = await axios.post(
            "https://tel-pending-leo-status.trycloudflare.com/upload-zip",
            formData, { headers: formData.getHeaders() }
        );
        console.log('📦 ML ZIP Upload Response:', response.data);
        const cleanedFolderName = response.data.folder_name.replace('.zip', '');
        res.status(200).json({
            message: 'ZIP uploaded',
            mlResponse: {...response.data, folder_name: cleanedFolderName }
        });
    } catch (error) {
        console.error('❌ ZIP Upload Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// 🟦 Step 2: Upload reference image
router.post('/upload-target-image', upload.single('file'), async(req, res) => {
    try {
        const folderName = req.body.folder_name;
        const email = req.user?.emails?.[0]?.value || req.session.email;

        if (!req.file || !folderName) {
            return res.status(400).json({ error: 'Missing reference image or folder name.' });
        }
        if (!email) return res.status(401).json({ error: "Unauthorized" });

        // ✅ Check reference credits
        await updateCredits(email, 'ref');

        const formData = new FormData();
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname || 'ref.jpg',
            contentType: req.file.mimetype,
        });
        formData.append('folder_name', folderName);
        formData.append('username', 'bob');
        console.log('📤 Sending to ML server with folder:', folderName);
        const response = await axios.post(
            'https://tel-pending-leo-status.trycloudflare.com/Extract_relavant_photos',
            formData, { headers: formData.getHeaders() }
        );
        console.log('✅ ML Response:', response.data);
        res.status(200).json(response.data);
    } catch (error) {
        console.error('❌ Reference Upload Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

export default router;