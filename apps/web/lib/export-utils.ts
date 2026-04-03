import type { Speaker } from "@analyst-platform/shared";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export async function exportToExcel(speakers: Speaker[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Analyst Platform";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Speakers");

  // Define columns with styled headers
  worksheet.columns = [
    { header: "Name", key: "name", width: 25 },
    { header: "Title", key: "title", width: 30 },
    { header: "Company", key: "company", width: 25 },
    { header: "LinkedIn URL", key: "linkedinUrl", width: 40 },
    { header: "Headline", key: "headline", width: 40 },
    { header: "Enriched Role", key: "enrichedRole", width: 25 },
    { header: "Enriched Company", key: "enrichedCompany", width: 25 },
    { header: "Status", key: "enrichmentStatus", width: 15 },
  ];

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1a1a1a" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "left" };
  headerRow.height = 28;

  // Add data rows
  for (const speaker of speakers) {
    worksheet.addRow({
      name: speaker.name,
      title: speaker.title || "",
      company: speaker.company || "",
      linkedinUrl: speaker.linkedinUrl || "",
      headline: speaker.headline || "",
      enrichedRole: speaker.enrichedRole || "",
      enrichedCompany: speaker.enrichedCompany || "",
      enrichmentStatus: speaker.enrichmentStatus,
    });
  }

  // Auto-filter
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: speakers.length + 1, column: 8 },
  };

  // Add borders to all cells
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFe5e5e5" } },
        left: { style: "thin", color: { argb: "FFe5e5e5" } },
        bottom: { style: "thin", color: { argb: "FFe5e5e5" } },
        right: { style: "thin", color: { argb: "FFe5e5e5" } },
      };
    });
  });

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, "speakers-export.xlsx");
}
