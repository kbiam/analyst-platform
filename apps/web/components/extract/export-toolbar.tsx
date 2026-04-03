"use client";

import { Button } from "../ui/button";
import { Download } from "lucide-react";
import type { Speaker } from "@analyst-platform/shared";
import type { GridApi } from "ag-grid-community";
import { exportToExcel } from "../../lib/export-utils";

interface ExportToolbarProps {
  speakers: Speaker[];
  gridApi: GridApi | null;
}

export function ExportToolbar({ speakers, gridApi }: ExportToolbarProps) {
  if (speakers.length === 0) return null;

  function handleExportCsv() {
    if (!gridApi) return;
    gridApi.exportDataAsCsv({
      fileName: "speakers-export.csv",
    });
  }

  async function handleExportExcel() {
    await exportToExcel(speakers);
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleExportCsv}>
        <Download className="h-3.5 w-3.5" />
        CSV
      </Button>
      <Button variant="outline" size="sm" onClick={handleExportExcel}>
        <Download className="h-3.5 w-3.5" />
        Excel
      </Button>
    </div>
  );
}
