const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const ExcelJS = require('exceljs');

/**
 * Calculates page count from file buffer based on extension
 */
async function calculatePageCount(filePath, extension) {
  try {
    const fileBuffer = fs.readFileSync(filePath);

    switch (extension.toLowerCase()) {
      case 'pdf': {
        const data = await pdfParse(fileBuffer);
        return Math.max(1, data.numpages || 1);
      }
      case 'docx': {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        const text = result.value || '';
        // Estimate ~2,500 characters per standard printed A4 page
        return Math.max(1, Math.ceil(text.length / 2500));
      }
      case 'xlsx': {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(fileBuffer);
        return Math.max(1, workbook.worksheets.length);
      }
      default:
        return 1;
    }
  } catch (err) {
    console.error(`Page count estimation error for ${extension}:`, err);
    return 1; 
  }
}

module.exports = { calculatePageCount };