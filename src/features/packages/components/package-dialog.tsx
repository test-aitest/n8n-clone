"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect } from "react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  executionMode: z.enum(["PARALLEL", "SEQUENTIAL"]),
});

export type PackageFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PackageFormValues) => void;
  defaultValues?: Partial<PackageFormValues>;
  isLoading?: boolean;
  mode?: "create" | "edit";
}

export const PackageDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  isLoading,
  mode = "create",
}: Props) => {
  const form = useForm<PackageFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: defaultValues.name || "",
      description: defaultValues.description || "",
      executionMode: defaultValues.executionMode || "SEQUENTIAL",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: defaultValues.name || "",
        description: defaultValues.description || "",
        executionMode: defaultValues.executionMode || "SEQUENTIAL",
      });
    }
  }, [open, defaultValues.name, defaultValues.description, defaultValues.executionMode, form]);

  const handleSubmit = (values: PackageFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Package" : "Edit Package"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new package to group multiple workflows together."
              : "Update package settings."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Package" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what this package does..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="executionMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Execution Mode</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select execution mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SEQUENTIAL">
                        Sequential (one at a time)
                      </SelectItem>
                      <SelectItem value="PARALLEL">
                        Parallel (all at once)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {mode === "create" ? "Create" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
