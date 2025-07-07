// // backend/routes/ml.js
// import express from 'express';
// import axios from 'axios';
// import multer from 'multer';
// import FormData from 'form-data';
// import { updateCredits } from '../utils/creditManager.js';

// const router = express.Router();
// const storage = multer.memoryStorage();
// const upload = multer({ storage });

// // 🟦 Step 1: Upload ZIP folder of photos
// router.post('/upload-photos', upload.single('file'), async(req, res) => {
//     try {
//         if (!req.file) return res.status(400).json({ error: 'No ZIP file uploaded' });

//         const email = req.user ? .emails ? .[0] ? .value || req.session.email;
//         if (!email) return res.status(401).json({ error: "Unauthorized" });

//         // ✅ Check ZIP credits
//         await updateCredits(email, 'zip');

//         const formData = new FormData();
//         formData.append('file', req.file.buffer, {
//             filename: req.file.originalname || 'photos.zip',
//             contentType: 'application/zip',
//         });
//         formData.append('username', 'bob');

//         const response = await axios.post(
//             "https://anshmittal-myapi.hf.space/upload-zip",
//             formData, { headers: formData.getHeaders() }
//         );
//         console.log('📦 ML ZIP Upload Response:', response.data);
//         const cleanedFolderName = response.data.folder_name.replace('.zip', '');
//         res.status(200).json({
//             message: 'ZIP uploaded',
//             mlResponse: {...response.data, folder_name: cleanedFolderName }
//         });
//     } catch (error) {
//         console.error('❌ ZIP Upload Error:', error.message);
//         res.status(500).json({ error: error.message });
//     }
// });

// // 🟦 Step 2: Upload reference image
// router.post('/upload-target-image', upload.single('file'), async(req, res) => {
//     try {
//         const folderName = req.body.folder_name;
//         const email = req.user ? .emails ? .[0] ? .value || req.session.email;

//         if (!req.file || !folderName) {
//             return res.status(400).json({ error: 'Missing reference image or folder name.' });
//         }
//         if (!email) return res.status(401).json({ error: "Unauthorized" });

//         // ✅ Check reference credits
//         await updateCredits(email, 'ref');

//         const formData = new FormData();
//         formData.append('file', req.file.buffer, {
//             filename: req.file.originalname || 'ref.jpg',
//             contentType: req.file.mimetype,
//         });
//         formData.append('folder_name', folderName);
//         formData.append('username', 'bob');
//         console.log('📤 Sending to ML server with folder:', folderName);
//         const response = await axios.post(
//             'https://anshmittal-myapi.hf.space/Extract_relavant_photos',
//             formData, { headers: formData.getHeaders() }
//         );
//         console.log('✅ ML Response:', response.data);
//         res.status(200).json(response.data);
//     } catch (error) {
//         console.error('❌ Reference Upload Error:', error.message);
//         res.status(500).json({ error: error.message });
//     }
// });

// export default router;
import express from 'express';
import axios from 'axios';
import multer from 'multer';
import FormData from 'form-data';
import { updateCredits } from '../utils/creditManager.js';
import { listFilesFromFolder } from '../utils/googleDrive.js'; // 👈 make sure this exists

const router = express.Router();

// ✅ Multer setup for memory storage (up to 50MB)
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }
});

// ✅ Helper to extract user email
const getUserEmail = (req) =>
    req.user?.email ||
    req.user?.emails?.[0]?.value ||
    req.session?.email || null;

// ✅ Step 1: Upload ZIP of photos
router.post('/upload-photos', upload.single('file'), async (req, res) => {
    console.log("📩 Received upload-photos request");
    console.log("🧠 Session:", req.session);
    console.log("👤 req.user:", req.user);

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No ZIP file uploaded' });
        }

        const email = getUserEmail(req);
        if (!email) {
            return res.status(401).json({ error: "Unauthorized - No user email" });
        }

        await updateCredits(email, 'zip');

        const formData = new FormData();
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname || 'photos.zip',
            contentType: 'application/zip',
        });
        formData.append('username', email);

        const response = await axios.post(
            "https://anshmittal-myapi.hf.space/upload-zip",
            formData,
            {
                headers: formData.getHeaders(),
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                timeout: 120000
            }
        );

        const cleanedFolderName = response.data.folder_name.replace('.zip', '');

        res.status(200).json({
            message: 'ZIP uploaded',
            mlResponse: { ...response.data, folder_name: cleanedFolderName }
        });

    } catch (error) {
        console.error('❌ ZIP Upload Error:', error.message);
        res.status(500).json({
            error: 'Error uploading ZIP',
            details: error.response?.data || error.message
        });
    }
});

// ✅ Step 2: Upload reference image and get Google Drive folder ID
router.post('/upload-target-image', upload.single('file'), async (req, res) => {
    console.log("📩 Received upload-target-image request");
    console.log("🧠 Session:", req.session);
    console.log("👤 req.user:", req.user);

    try {
        const folderName = req.body.folder_name;
        const email = getUserEmail(req);

        if (!req.file || !folderName) {
            return res.status(400).json({ error: 'Missing reference image or folder name.' });
        }

        if (!email) {
            return res.status(401).json({ error: "Unauthorized - No user email" });
        }

        await updateCredits(email, 'ref');

        const formData = new FormData();
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname || 'ref.jpg',
            contentType: req.file.mimetype,
        });
        formData.append('folder_name', folderName);
        formData.append('username', email);

        const response = await axios.post(
            "https://anshmittal-myapi.hf.space/Extract_relavant_photos",
            formData,
            {
                headers: formData.getHeaders(),
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                timeout: 120000
            }
        );

        console.log('📦 ML API response:', response.data);

        const outputFolderId = response.data.output;

        if (!outputFolderId) {
            return res.status(500).json({ error: 'ML did not return output folder ID.' });
        }

        res.status(200).json({
            message: 'Success',
            folder_id: outputFolderId
        });

    } catch (error) {
        console.error('❌ Reference Upload Error:', error.message);
        res.status(500).json({
            error: 'Error uploading reference image',
            details: error.response?.data || error.message
        });
    }
});

// ✅ Step 3: List images from Google Drive using folder ID
router.get('/get-images/:folderId', async (req, res) => {
  const { folderId } = req.params;

  try {
    const files = await listFilesFromFolder(folderId);
console.log("Files from Drive API:", files);
    const images = files.filter(file => file.mimeType && file.mimeType.startsWith('image/'))
      .map(file => ({
        name: file.name,
        id: file.id,
        webViewLink: `https://drive.google.com/file/d/${file.id}/view`,
        webContentLink: `https://drive.google.com/uc?id=${file.id}`,
      }));

    res.status(200).json({ images });
  } catch (err) {
    console.error('❌ Error listing files from Drive:', err.message);
    res.status(500).json({ error: err.message });
  }
});



export default router;
