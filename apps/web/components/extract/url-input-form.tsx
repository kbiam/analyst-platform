"use client";

import { useState, type FormEvent } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ArrowRight, Loader2 } from "lucide-react";

interface UrlInputFormProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export function UrlInputForm({ onSubmit, isLoading }: UrlInputFormProps) {
  const [url, setUrl] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim() || isLoading) return;

    // Basic URL validation
    try {
      new URL(url.trim());
    } catch {
      return;
    }

    onSubmit(url.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full">
      <Input
        type="url"
        placeholder="Enter event page URL..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={isLoading}
        className="h-10 text-sm"
        required
      />
      <Button
        type="submit"
        variant="accent"
        size="default"
        disabled={isLoading || !url.trim()}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Extracting...
          </>
        ) : (
          <>
            Extract
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}
