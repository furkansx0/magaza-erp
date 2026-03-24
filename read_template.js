const XLSX = require('xlsx');

try {
    const workbook = XLSX.readFile('C:\\Users\\Furkan\\Downloads\\Urun_Yukleme_Sablonu (12).xlsx');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];
    console.log("HEADERS:", JSON.stringify(headers));
} catch (e) {
    console.error(e.message);
}
