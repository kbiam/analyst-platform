"use client";

import { useCallback, useRef, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import type {
  ColDef,
  GridApi,
  GridReadyEvent,
  GetRowIdParams,
  CellClassRules,
  ICellRendererParams,
} from "ag-grid-community";
import type { Speaker } from "@analyst-platform/shared";

interface SpeakersGridProps {
  speakers: Speaker[];
  onGridReady?: (api: GridApi) => void;
}

export function SpeakersGrid({ speakers, onGridReady }: SpeakersGridProps) {
  const gridApiRef = useRef<GridApi | null>(null);

  const enrichmentCellClass: CellClassRules = {
    "opacity-50 italic": (params) =>
      params.data?.enrichmentStatus === "pending" ||
      params.data?.enrichmentStatus === "enriching",
  };

  const columnDefs = useMemo<ColDef<Speaker>[]>(
    () => [
      {
        field: "name",
        headerName: "Name",
        editable: true,
        flex: 1.5,
        minWidth: 160,
      },
      {
        field: "title",
        headerName: "Title",
        editable: true,
        flex: 1.5,
        minWidth: 160,
      },
      {
        field: "company",
        headerName: "Company",
        editable: true,
        flex: 1,
        minWidth: 130,
      },
      {
        field: "linkedinUrl",
        headerName: "LinkedIn",
        editable: true,
        flex: 1.5,
        minWidth: 200,
        cellClassRules: enrichmentCellClass,
      },
      {
        field: "headline",
        headerName: "Headline",
        editable: true,
        flex: 2,
        minWidth: 200,
        cellClassRules: enrichmentCellClass,
      },
      {
        field: "enrichmentStatus",
        headerName: "Status",
        width: 110,
        editable: false,
        cellRenderer: (params: ICellRendererParams) => {
          const status = params.value;
          if (status === "enriched")
            return '<span style="color: #059669;">Enriched</span>';
          if (status === "enriching")
            return '<span style="color: #d97706;">Enriching...</span>';
          if (status === "failed")
            return '<span style="color: #dc2626;">Failed</span>';
          return '<span style="color: #737373;">Pending</span>';
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: true,
      filter: true,
    }),
    []
  );

  const handleGridReady = useCallback(
    (params: GridReadyEvent) => {
      gridApiRef.current = params.api;
      onGridReady?.(params.api);
    },
    [onGridReady]
  );

  const getRowId = useCallback(
    (params: GetRowIdParams<Speaker>) => params.data.id,
    []
  );

  return (
    <div className="w-full h-full relative ag-theme-quartz">
      {speakers.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground z-10">
          <p className="text-lg">No speakers yet</p>
          <p className="text-sm mt-1">
            Enter an event page URL to get started
          </p>
        </div>
      )}
      <AgGridReact<Speaker>
        rowData={speakers}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        onGridReady={handleGridReady}
        getRowId={getRowId}
        animateRows={true}
        rowSelection="multiple"
        suppressRowClickSelection={true}
      />
    </div>
  );
}
