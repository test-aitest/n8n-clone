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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Image,
  Upload,
  Trash2,
  MoreVertical,
  Edit,
  Eye,
  Download,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface GoldenMasterManagerProps {
  workflowId: string;
  nodeId?: string;
}

export function GoldenMasterManager({
  workflowId,
  nodeId,
}: GoldenMasterManagerProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedGoldenMaster, setSelectedGoldenMaster] = useState<{
    id: string;
    name: string;
    imageUrl: string;
  } | null>(null);
  const [newName, setNewName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Fetch Golden Masters
  const { data: goldenMasters, isLoading } = useQuery(
    trpc.iosTesting.getGoldenMasters.queryOptions({
      workflowId,
      nodeId,
    })
  );

  // Delete mutation
  const deleteMutation = useMutation(
    trpc.iosTesting.deleteGoldenMaster.mutationOptions({
      onSuccess: () => {
        toast.success("Golden master deleted");
        queryClient.invalidateQueries({
          queryKey: trpc.iosTesting.getGoldenMasters.queryKey({ workflowId }),
        });
        setIsDeleteOpen(false);
        setSelectedGoldenMaster(null);
      },
      onError: (error) => {
        toast.error(`Failed to delete: ${error.message}`);
      },
    })
  );

  // Update mutation
  const updateMutation = useMutation(
    trpc.iosTesting.updateGoldenMaster.mutationOptions({
      onSuccess: () => {
        toast.success("Golden master updated");
        queryClient.invalidateQueries({
          queryKey: trpc.iosTesting.getGoldenMasters.queryKey({ workflowId }),
        });
      },
      onError: (error) => {
        toast.error(`Failed to update: ${error.message}`);
      },
    })
  );

  // Create mutation
  const createMutation = useMutation(
    trpc.iosTesting.createGoldenMaster.mutationOptions({
      onSuccess: () => {
        toast.success("Golden master created");
        queryClient.invalidateQueries({
          queryKey: trpc.iosTesting.getGoldenMasters.queryKey({ workflowId }),
        });
        setIsCreateOpen(false);
        setNewName("");
        setUploadFile(null);
      },
      onError: (error) => {
        toast.error(`Failed to create: ${error.message}`);
      },
    })
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (!file.type.startsWith("image/")) {
          toast.error("Please select an image file");
          return;
        }
        setUploadFile(file);
      }
    },
    []
  );

  const handleCreate = useCallback(async () => {
    if (!uploadFile || !newName.trim()) {
      toast.error("Please provide a name and select an image");
      return;
    }

    setIsUploading(true);

    try {
      // Convert file to base64 data URL for storage
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageUrl = e.target?.result as string;

        await createMutation.mutateAsync({
          workflowId,
          nodeId: nodeId || "",
          name: newName.trim(),
          imageUrl,
        });
      };
      reader.readAsDataURL(uploadFile);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  }, [uploadFile, newName, workflowId, nodeId, createMutation]);

  const handleDelete = useCallback(() => {
    if (selectedGoldenMaster) {
      deleteMutation.mutate({ id: selectedGoldenMaster.id });
    }
  }, [selectedGoldenMaster, deleteMutation]);

  const handleRename = useCallback(
    (id: string, name: string) => {
      updateMutation.mutate({ id, name });
    },
    [updateMutation]
  );

  const handleDownload = useCallback(
    (gm: { name: string; imageUrl: string }) => {
      const link = document.createElement("a");
      link.href = gm.imageUrl;
      link.download = `${gm.name}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    []
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Golden Masters</h3>
          <p className="text-sm text-muted-foreground">
            Manage baseline images for visual regression testing
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="size-4 mr-2" />
              Add Golden Master
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Golden Master</DialogTitle>
              <DialogDescription>
                Upload a baseline image for visual comparison tests
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., login-screen-default"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image">Image</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="cursor-pointer"
                  />
                </div>
                {uploadFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {uploadFile.name} (
                    {(uploadFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isUploading || !uploadFile || !newName.trim()}
              >
                {isUploading ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="size-4 mr-2" />
                )}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!goldenMasters || goldenMasters.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="size-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No golden masters yet.
              <br />
              Create one to start visual regression testing.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goldenMasters.map((gm) => (
              <Card key={gm.id} className="overflow-hidden">
                <div
                  className="aspect-video bg-muted relative cursor-pointer"
                  onClick={() => {
                    setSelectedGoldenMaster(gm);
                    setIsPreviewOpen(true);
                  }}
                >
                  {gm.imageUrl.startsWith("data:") ? (
                    <img
                      src={gm.imageUrl}
                      alt={gm.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Image className="size-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                    <Eye className="size-8 text-white" />
                  </div>
                </div>
                <CardHeader className="p-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium truncate">
                      {gm.name}
                    </CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedGoldenMaster(gm);
                            setIsPreviewOpen(true);
                          }}
                        >
                          <Eye className="size-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(gm)}>
                          <Download className="size-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            const newName = prompt("Enter new name:", gm.name);
                            if (newName && newName !== gm.name) {
                              handleRename(gm.id, newName);
                            }
                          }}
                        >
                          <Edit className="size-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setSelectedGoldenMaster(gm);
                            setIsDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="size-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription className="text-xs">
                    Created{" "}
                    {formatDistanceToNow(new Date(gm.createdAt), {
                      addSuffix: true,
                    })}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedGoldenMaster?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center bg-muted rounded-lg p-4 min-h-100">
            {selectedGoldenMaster?.imageUrl && (
              <img
                src={selectedGoldenMaster.imageUrl}
                alt={selectedGoldenMaster.name}
                className="max-w-full max-h-[60vh] object-contain"
              />
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                selectedGoldenMaster && handleDownload(selectedGoldenMaster)
              }
            >
              <Download className="size-4 mr-2" />
              Download
            </Button>
            <Button onClick={() => setIsPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Golden Master?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedGoldenMaster?.name}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * Compact Golden Master selector for node dialogs
 */
interface GoldenMasterSelectorProps {
  workflowId: string;
  value?: string;
  onChange: (id: string, imageUrl: string) => void;
}

export function GoldenMasterSelector({
  workflowId,
  value,
  onChange,
}: GoldenMasterSelectorProps) {
  const trpc = useTRPC();
  const { data: goldenMasters, isLoading } = useQuery(
    trpc.iosTesting.getGoldenMasters.queryOptions({
      workflowId,
    })
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-2 border rounded-md">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!goldenMasters || goldenMasters.length === 0) {
    return (
      <div className="p-3 border border-dashed rounded-md text-center">
        <p className="text-sm text-muted-foreground">
          No golden masters available
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {goldenMasters.map((gm) => (
        <button
          key={gm.id}
          type="button"
          className={`relative aspect-video rounded-md overflow-hidden border-2 transition-colors ${
            value === gm.id ? "border-primary" : "border-transparent"
          }`}
          onClick={() => onChange(gm.id, gm.imageUrl)}
        >
          {gm.imageUrl.startsWith("data:") ? (
            <img
              src={gm.imageUrl}
              alt={gm.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Image className="size-6 text-muted-foreground" />
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-1">
            <p className="text-xs text-white truncate">{gm.name}</p>
          </div>
          {value === gm.id && (
            <Badge className="absolute top-1 right-1" variant="default">
              Selected
            </Badge>
          )}
        </button>
      ))}
    </div>
  );
}
