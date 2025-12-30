"use client";

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message: "Variable name must start with a letter or underscore",
    }),
  baselineImage: z.string().min(1, { message: "Baseline image path is required" }),
  threshold: z.string().optional(),
  timeout: z.string().optional(),
});

export type ExpectVisualFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ExpectVisualFormValues) => void;
  defaultValues?: Partial<ExpectVisualFormValues>;
}

export const ExpectVisualDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const form = useForm<ExpectVisualFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "expectVisual",
      baselineImage: defaultValues.baselineImage || "",
      threshold: defaultValues.threshold || "0.1",
      timeout: defaultValues.timeout || "10000",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "expectVisual",
        baselineImage: defaultValues.baselineImage || "",
        threshold: defaultValues.threshold || "0.1",
        timeout: defaultValues.timeout || "10000",
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: ExpectVisualFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Expect Visual Match</DialogTitle>
          <DialogDescription>
            Compare current screenshot with a baseline image for visual regression testing.
            Uses pixelmatch for image comparison.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-4">
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input placeholder="expectVisual" {...field} />
                  </FormControl>
                  <FormDescription>
                    Reference this result in other nodes
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="baselineImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Baseline Image Path</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="/path/to/baseline/login-screen.png"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Path to the baseline image file for comparison
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="threshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Threshold (0-1)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      placeholder="0.1"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum allowed difference ratio (0 = exact match, 1 = any match).
                    Default: 0.1 (10% difference allowed)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timeout"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timeout (ms)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="10000" {...field} />
                  </FormControl>
                  <FormDescription>
                    Maximum time for screenshot capture (default: 10s)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
