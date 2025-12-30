"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  XCircle,
  Code,
  FileCode,
  Download,
  Upload,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * UI Component from analysis
 */
interface UIComponent {
  id: string;
  type: string;
  label: string | null;
  hasAccessibilityId: boolean;
  suggestedId: string;
  sourceLocation: {
    line: number;
    column: number;
    endLine: number;
    endColumn: number;
  };
  parentView: string;
}

/**
 * Analysis result
 */
interface AnalysisResult {
  filePath: string;
  components: UIComponent[];
  componentsNeedingIds: UIComponent[];
  totalCount: number;
  withAccessibilityIdCount: number;
}

/**
 * Injection result
 */
interface InjectionResult {
  originalFilePath: string;
  modifiedSource: string;
  injectedCount: number;
  injectedIds: string[];
}

interface CodePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId: string;
  onComponentsDetected?: (components: UIComponent[]) => void;
  onGenerateNodes?: (components: UIComponent[]) => void;
}

export function CodePreviewDialog({
  open,
  onOpenChange,
  workflowId,
  onComponentsDetected,
  onGenerateNodes,
}: CodePreviewDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [originalSource, setOriginalSource] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [injectionResult, setInjectionResult] =
    useState<InjectionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isInjecting, setIsInjecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("original");

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      if (!selectedFile.name.endsWith(".swift")) {
        setError("Only .swift files are allowed");
        return;
      }

      setFile(selectedFile);
      setError(null);
      setAnalysisResult(null);
      setInjectionResult(null);

      // Read file content
      const content = await selectedFile.text();
      setOriginalSource(content);
    },
    []
  );

  const handleAnalyze = useCallback(async () => {
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workflowId", workflowId);
      formData.append("mode", "analyze");

      const response = await fetch("/api/swift-upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setAnalysisResult(data.result);
      onComponentsDetected?.(data.result.components);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  }, [file, workflowId, onComponentsDetected]);

  const handleInject = useCallback(async () => {
    if (!file) return;

    setIsInjecting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workflowId", workflowId);
      formData.append("mode", "inject");

      const response = await fetch("/api/swift-upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Injection failed");
      }

      setInjectionResult(data.result);
      setActiveTab("modified");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Injection failed");
    } finally {
      setIsInjecting(false);
    }
  }, [file, workflowId]);

  const handleDownloadModified = useCallback(() => {
    if (!injectionResult) return;

    const blob = new Blob([injectionResult.modifiedSource], {
      type: "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = injectionResult.originalFilePath.replace(
      ".swift",
      "_injected.swift"
    );
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [injectionResult]);

  const handleGenerateNodes = useCallback(() => {
    if (!analysisResult) return;
    onGenerateNodes?.(analysisResult.componentsNeedingIds);
    onOpenChange(false);
  }, [analysisResult, onGenerateNodes, onOpenChange]);

  const renderCodeWithHighlights = (
    source: string,
    components: UIComponent[]
  ) => {
    const lines = source.split("\n");

    return (
      <pre className="text-sm font-mono">
        {lines.map((line, index) => {
          const lineNumber = index + 1;
          const componentsOnLine = components.filter(
            (c) => c.sourceLocation.line === lineNumber
          );

          const hasComponent = componentsOnLine.length > 0;
          const needsId = componentsOnLine.some((c) => !c.hasAccessibilityId);

          return (
            <div
              key={index}
              className={cn(
                "flex",
                hasComponent && needsId && "bg-yellow-500/10",
                hasComponent && !needsId && "bg-green-500/10"
              )}
            >
              <span className="w-12 text-right pr-4 text-muted-foreground select-none">
                {lineNumber}
              </span>
              <span className="flex-1 whitespace-pre">{line}</span>
              {hasComponent && (
                <span className="ml-2">
                  {componentsOnLine.map((c) => (
                    <Badge
                      key={c.id}
                      variant={c.hasAccessibilityId ? "default" : "secondary"}
                      className="ml-1 text-xs"
                    >
                      {c.type}
                    </Badge>
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </pre>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="size-5" />
            Swift Source Analyzer
          </DialogTitle>
          <DialogDescription>
            Upload a SwiftUI source file to detect UI components and inject
            accessibility identifiers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="file"
                accept=".swift"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button variant="outline" asChild>
                <span>
                  <Upload className="size-4 mr-2" />
                  {file ? file.name : "Select Swift File"}
                </span>
              </Button>
            </label>

            {file && (
              <>
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  variant="secondary"
                >
                  {isAnalyzing ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <Code className="size-4 mr-2" />
                  )}
                  Analyze
                </Button>

                {analysisResult && (
                  <Button
                    onClick={handleInject}
                    disabled={
                      isInjecting ||
                      analysisResult.componentsNeedingIds.length === 0
                    }
                  >
                    {isInjecting ? (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : (
                      <Code className="size-4 mr-2" />
                    )}
                    Inject IDs
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md flex items-center gap-2">
              <XCircle className="size-4" />
              {error}
            </div>
          )}

          {/* Analysis Summary */}
          {analysisResult && (
            <div className="grid grid-cols-4 gap-4">
              <div className="p-3 bg-muted rounded-md">
                <div className="text-2xl font-bold">
                  {analysisResult.totalCount}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Components
                </div>
              </div>
              <div className="p-3 bg-green-500/10 rounded-md">
                <div className="text-2xl font-bold text-green-600">
                  {analysisResult.withAccessibilityIdCount}
                </div>
                <div className="text-sm text-muted-foreground">
                  With Accessibility ID
                </div>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-md">
                <div className="text-2xl font-bold text-yellow-600">
                  {analysisResult.componentsNeedingIds.length}
                </div>
                <div className="text-sm text-muted-foreground">Needs ID</div>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <div className="text-2xl font-bold">
                  {
                    new Set(analysisResult.components.map((c) => c.parentView))
                      .size
                  }
                </div>
                <div className="text-sm text-muted-foreground">Views</div>
              </div>
            </div>
          )}

          {/* Code Preview */}
          {originalSource && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="original">Original</TabsTrigger>
                {injectionResult && (
                  <TabsTrigger value="modified">
                    Modified (+{injectionResult.injectedCount} IDs)
                  </TabsTrigger>
                )}
                {analysisResult && (
                  <TabsTrigger value="components">Components</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="original">
                <ScrollArea className="h-100 border rounded-md p-4 bg-muted/30">
                  {renderCodeWithHighlights(
                    originalSource,
                    analysisResult?.components || []
                  )}
                </ScrollArea>
              </TabsContent>

              {injectionResult && (
                <TabsContent value="modified">
                  <ScrollArea className="h-100 border rounded-md p-4 bg-muted/30">
                    <pre className="text-sm font-mono whitespace-pre">
                      {injectionResult.modifiedSource}
                    </pre>
                  </ScrollArea>
                </TabsContent>
              )}

              {analysisResult && (
                <TabsContent value="components">
                  <ScrollArea className="h-100 border rounded-md">
                    <div className="divide-y">
                      {analysisResult.components.map((comp) => (
                        <div
                          key={comp.id}
                          className="p-3 flex items-center gap-4"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge>{comp.type}</Badge>
                              <span className="text-sm font-medium">
                                {comp.label || "(no label)"}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Line {comp.sourceLocation.line} in{" "}
                              {comp.parentView}
                            </div>
                          </div>
                          <div className="text-xs font-mono bg-muted px-2 py-1 rounded">
                            {comp.suggestedId}
                          </div>
                          {comp.hasAccessibilityId ? (
                            <CheckCircle className="size-4 text-green-500" />
                          ) : (
                            <XCircle className="size-4 text-yellow-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              )}
            </Tabs>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {injectionResult && (
              <Button variant="outline" onClick={handleDownloadModified}>
                <Download className="size-4 mr-2" />
                Download Modified
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {analysisResult &&
              analysisResult.componentsNeedingIds.length > 0 && (
                <Button onClick={handleGenerateNodes}>
                  Generate {analysisResult.componentsNeedingIds.length} Nodes
                </Button>
              )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Component List Panel for sidebar
 */
interface ComponentListProps {
  components: UIComponent[];
  onSelect?: (component: UIComponent) => void;
}

export function ComponentList({ components, onSelect }: ComponentListProps) {
  const groupedByView = components.reduce((acc, comp) => {
    if (!acc[comp.parentView]) {
      acc[comp.parentView] = [];
    }
    acc[comp.parentView].push(comp);
    return acc;
  }, {} as Record<string, UIComponent[]>);

  return (
    <div className="space-y-4">
      {Object.entries(groupedByView).map(([viewName, viewComponents]) => (
        <div key={viewName}>
          <h4 className="text-sm font-medium mb-2">{viewName}</h4>
          <div className="space-y-1">
            {viewComponents.map((comp) => (
              <button
                key={comp.id}
                className="w-full p-2 text-left rounded-md hover:bg-muted transition-colors"
                onClick={() => onSelect?.(comp)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {comp.type}
                    </Badge>
                    <span className="text-sm truncate">
                      {comp.label || "(no label)"}
                    </span>
                  </div>
                  {comp.hasAccessibilityId ? (
                    <CheckCircle className="size-3 text-green-500" />
                  ) : (
                    <XCircle className="size-3 text-muted-foreground" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
