import { getSheet } from "../utils/googleSheet.js";

export const updateCredits = async(email, type) => {
    try {
        const sheet = await getSheet();
        const response = await sheet.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: "Sheet1",
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex((row) => row[1] === email);
        if (rowIndex === -1) throw new Error("User not found in the sheet");

        const userRow = rows[rowIndex];

        let zipCredits = parseInt(userRow[4] || "0"); // ✅ updated index
        let refCredits = parseInt(userRow[5] || "0"); // ✅ updated index

        if (type === "zip") {
            if (zipCredits <= 0) throw new Error("Your free plan is ended");
            zipCredits -= 1;
        } else if (type === "ref") {
            if (refCredits <= 0) throw new Error("No reference credits left");
            refCredits -= 1;
        } else {
            throw new Error("Invalid credit type");
        }

        userRow[4] = zipCredits.toString(); // ✅ save updated zipCredits
        userRow[5] = refCredits.toString(); // ✅ save updated refCredits

        await sheet.update({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: `Sheet1!A${rowIndex + 1}:F${rowIndex + 1}`, // ✅ 6 columns now
            valueInputOption: "RAW",
            resource: {
                values: [userRow],
            },
        });

        return { zipCredits, refCredits };
    } catch (err) {
        console.error("Error updating credits:", err.message);
        throw err;
    }
};