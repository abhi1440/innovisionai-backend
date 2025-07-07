// import { google } from 'googleapis';

// const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

// let drive;

// async function authorizeDrive() {
//     const auth = new google.auth.GoogleAuth({
//         credentials: {
//             client_email: process.env.GOOGLE_CLIENT_EMAIL,
//             private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
//         },
//         scopes: SCOPES,
//     });

//     const authClient = await auth.getClient();
//     drive = google.drive({ version: 'v3', auth: authClient });
// }

// export async function listFilesFromFolder(folderId) {
//     try {
//         if (!drive) await authorizeDrive();

//         const res = await drive.files.list({
//             q: `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`,
//             fields: 'files(id, name, mimeType)',
//         });

//         return res.data.files.map(file => ({
//             name: file.name,
//             mimeType: file.mimeType,
//             webViewLink: `https://drive.google.com/file/d/${file.id}/view`,
//             webContentLink: `https://drive.google.com/uc?id=${file.id}`,
//         }));
//     } catch (err) {
//         console.error('❌ Error listing files from Drive:', err.message);
//         return [];
//     }
// }

import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/drive'];

let drive;

export async function authorizeDrive() {
    if (drive) return drive;

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: SCOPES,
    });

    const authClient = await auth.getClient();
    drive = google.drive({ version: 'v3', auth: authClient });
    return drive;
}

export async function listFilesFromFolder(folderId) {
    try {
        const driveClient = await authorizeDrive();

        const res = await driveClient.files.list({
            q: `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`,
            fields: 'files(id, name, mimeType)',
            pageSize: 1000,
        });

        return res.data.files || [];
    } catch (err) {
        console.error('❌ Error listing files from Drive:', err.message);
        return [];
    }
}