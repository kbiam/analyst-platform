"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { GridApi } from "ag-grid-community";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  useMessage,
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
} from "@assistant-ui/react";
import type { TextMessagePartProps } from "@assistant-ui/react";
import { ArrowLeft, Send } from "lucide-react";

import { useSpeakersState } from "../../hooks/use-speakers-state";
import { useExtractionAdapter } from "../../hooks/use-extraction-adapter";
import { UrlInputForm } from "../../components/extract/url-input-form";
import { SpeakersGrid } from "../../components/extract/speakers-grid";
import { ExportToolbar } from "../../components/extract/export-toolbar";
import { EnrichmentOptions } from "../../components/extract/enrichment-options";
import { UploadForm } from "../../components/extract/upload-form";
import { Tabs } from "../../components/ui/tabs";

const TABS = [
  { id: "link", label: "From Link" },
  { id: "upload", label: "Upload" },
  { id: "chat", label: "Chat" },
];

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2 py-2">
      <div className="flex items-center gap-1 bg-muted rounded-full px-3 py-1.5">
        <span className="text-xs text-muted-foreground font-medium">Thinking</span>
        <span className="flex gap-0.5 ml-0.5">
          <span className="w-1 h-1 rounded-full bg-muted-foreground thinking-dot-1" />
          <span className="w-1 h-1 rounded-full bg-muted-foreground thinking-dot-2" />
          <span className="w-1 h-1 rounded-full bg-muted-foreground thinking-dot-3" />
        </span>
      </div>
    </div>
  );
}

function CompletedTextPart({ text }: TextMessagePartProps) {
  return (
    <p className="text-sm leading-relaxed text-foreground">{text}</p>
  );
}

function AssistantMessage() {
  const isRunning = useMessage((state) => state.status?.type === "running");

  if (isRunning) {
    return (
      <MessagePrimitive.Root className="py-1">
        <ThinkingIndicator />
      </MessagePrimitive.Root>
    );
  }

  return (
    <MessagePrimitive.Root className="py-2">
      <div className="bg-muted/50 rounded-lg px-3 py-2">
        <MessagePrimitive.Content
          components={{ Text: CompletedTextPart }}
        />
      </div>
    </MessagePrimitive.Root>
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="py-2 flex justify-end">
      <div className="bg-accent/10 rounded-lg px-3 py-2 max-w-[80%]">
        <MessagePrimitive.Content
          components={{ Text: CompletedTextPart }}
        />
      </div>
    </MessagePrimitive.Root>
  );
}

function Thread({ visible }: { visible: boolean }) {
  return (
    <ThreadPrimitive.Root
      className={visible ? "flex flex-col flex-1 min-h-0" : "hidden"}
    >
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto px-3 py-2">
        <ThreadPrimitive.Empty>
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Enter a URL above or type one here to start extracting speakers.
          </div>
        </ThreadPrimitive.Empty>
        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            AssistantMessage,
          }}
        />
      </ThreadPrimitive.Viewport>
      <div className="border-t border-border p-2">
        <ComposerPrimitive.Root className="flex gap-2">
          <ComposerPrimitive.Input
            placeholder="Paste a URL to extract..."
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          />
          <ComposerPrimitive.Send className="inline-flex items-center justify-center rounded-lg bg-accent text-accent-foreground h-9 w-9 hover:bg-accent/90 disabled:opacity-50 disabled:pointer-events-none">
            <Send className="h-4 w-4" />
          </ComposerPrimitive.Send>
        </ComposerPrimitive.Root>
      </div>
    </ThreadPrimitive.Root>
  );
}

function ExtractPageInner() {
  const { speakers, status, error, callbacks } = useSpeakersState();
  const [activeTab, setActiveTab] = useState("link");
  const [enrichLinkedin, setEnrichLinkedin] = useState(true);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);

  const adapter = useExtractionAdapter(callbacks, enrichLinkedin);
  const runtime = useLocalRuntime(adapter);

  const isLoading =
    status === "pending" || status === "scraping" || status === "enriching";

  const handleGridReady = useCallback((api: GridApi) => {
    setGridApi(api);
  }, []);

  const handleUrlSubmit = useCallback(
    (url: string) => {
      // Append the URL as a user message to the runtime
      runtime.threads.main.append({
        role: "user",
        content: [{ type: "text", text: url }],
      });
      setActiveTab("chat");
    },
    [runtime]
  );

  const handleFileSelect = useCallback((file: File) => {
    // Stub: future CSV/Excel parsing
    console.log("File selected:", file.name);
  }, []);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="border-b border-border shrink-0">
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/tools"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <h1 className="text-lg font-semibold">
                Event Intelligence Extractor
              </h1>
            </div>
            <ExportToolbar speakers={speakers} gridApi={gridApi} />
          </div>
        </header>

        {/* Main split panel */}
        <div className="flex-1 min-h-0 grid grid-cols-[400px_1fr]">
          {/* Left panel */}
          <div className="border-r border-border flex flex-col min-h-0">
            {/* Enrichment options */}
            <EnrichmentOptions
              linkedinEnabled={enrichLinkedin}
              onLinkedinChange={setEnrichLinkedin}
              className="px-4 py-3 border-b border-border"
            />

            {/* Tabs */}
            <Tabs
              tabs={TABS}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            {/* Tab content */}
            <div className="flex-1 flex flex-col min-h-0">
              {activeTab === "link" && (
                <div className="p-4">
                  <UrlInputForm
                    onSubmit={handleUrlSubmit}
                    isLoading={isLoading}
                  />
                </div>
              )}

              {activeTab === "upload" && (
                <div className="p-4">
                  <UploadForm
                    onFileSelect={handleFileSelect}
                    disabled={isLoading}
                  />
                </div>
              )}

              {/* Thread — always rendered, visibility toggled by CSS */}
              <Thread visible={activeTab === "chat"} />
            </div>

            {/* Error */}
            {error && (
              <div className="mx-4 mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <p className="font-medium">Extraction failed</p>
                <p className="mt-1">{error}</p>
              </div>
            )}
          </div>

          {/* Right panel — Grid */}
          <div className="min-h-0 p-4">
            <SpeakersGrid speakers={speakers} onGridReady={handleGridReady} />
          </div>
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}

export default function ExtractPage() {
  return <ExtractPageInner />;
}
