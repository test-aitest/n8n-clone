"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AddToPackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId: string;
  workflowName: string;
}

export const AddToPackageDialog = ({
  open,
  onOpenChange,
  workflowId,
  workflowName,
}: AddToPackageDialogProps) => {
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Get all packages
  const packagesQuery = useQuery(
    trpc.packages.getAllPackages.queryOptions()
  );

  const addToPackage = useMutation(
    trpc.packages.addWorkflow.mutationOptions({
      onSuccess: () => {
        toast.success(`Workflow "${workflowName}" added to package`);
        queryClient.invalidateQueries(trpc.packages.getMany.queryFilter({}));
        queryClient.invalidateQueries(trpc.packages.getOne.queryFilter({}));
        onOpenChange(false);
        setSelectedPackageId("");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to add workflow to package");
      },
    })
  );

  const handleAdd = () => {
    if (!selectedPackageId) return;
    addToPackage.mutate({
      packageId: selectedPackageId,
      workflowId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Package</DialogTitle>
          <DialogDescription>
            Add &quot;{workflowName}&quot; to a package for batch execution.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {packagesQuery.isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : packagesQuery.data?.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No packages found. Create a package first.
            </div>
          ) : (
            <Select
              value={selectedPackageId}
              onValueChange={setSelectedPackageId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a package" />
              </SelectTrigger>
              <SelectContent>
                {packagesQuery.data?.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.name} ({pkg.project.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={addToPackage.isPending || !selectedPackageId}
          >
            {addToPackage.isPending && (
              <Loader2 className="size-4 animate-spin" />
            )}
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
