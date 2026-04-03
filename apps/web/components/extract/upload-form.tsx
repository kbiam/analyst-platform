"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import { Button } from "../ui/button";
import { Upload } from "lucide-react";
import { cn } from "../../lib/utils";

interface UploadFormProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  className?: string;
}

export function UploadForm({ onFileSelect, disabled, className }: UploadFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      const validTypes = [
        "text/csv",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ];
      if (validTypes.includes(file.type) || file.name.endsWith(".csv") || file.name.endsWith(".xlsx")) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors",
          isDragging
            ? "border-accent bg-accent/5"
            : "border-border hover:border-muted-foreground/50",
          disabled && "opacity-50 pointer-events-none"
        )}
      >
        <Upload className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">
          Drag & drop a CSV or Excel file, or
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          Browse files
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Supported formats: CSV, Excel (.xlsx)
      </p>
    </div>
  );
}
