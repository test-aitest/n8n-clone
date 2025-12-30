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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message: "Variable name must start with a letter or underscore",
    }),
  comparisonMode: z.enum(["baseline", "goldenMaster", "createBaseline"]),
  baselineImage: z.string().optional(),
  goldenMasterId: z.string().optional(),
  baselineName: z.string().optional(),
  threshold: z.string().optional(),
  timeout: z.string().optional(),
  saveOnMismatch: z.boolean().optional(),
});

export type ExpectVisualFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ExpectVisualFormValues) => void;
  defaultValues?: Partial<ExpectVisualFormValues>;
  workflowId?: string;
}

export const ExpectVisualDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  workflowId,
}: Props) => {
  const form = useForm<ExpectVisualFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "expectVisual",
      comparisonMode: defaultValues.comparisonMode || "baseline",
      baselineImage: defaultValues.baselineImage || "",
      goldenMasterId: defaultValues.goldenMasterId || "",
      baselineName: defaultValues.baselineName || "",
      threshold: defaultValues.threshold || "0.1",
      timeout: defaultValues.timeout || "10000",
      saveOnMismatch: defaultValues.saveOnMismatch ?? true,
    },
  });

  const comparisonMode = form.watch("comparisonMode");

  // Fetch Golden Masters for the workflow
  const trpc = useTRPC();
  const { data: goldenMasters } = useQuery(
    trpc.iosTesting.getGoldenMasters.queryOptions(
      { workflowId: workflowId || "" },
      { enabled: !!workflowId && open }
    )
  );

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "expectVisual",
        comparisonMode: defaultValues.comparisonMode || "baseline",
        baselineImage: defaultValues.baselineImage || "",
        goldenMasterId: defaultValues.goldenMasterId || "",
        baselineName: defaultValues.baselineName || "",
        threshold: defaultValues.threshold || "0.1",
        timeout: defaultValues.timeout || "10000",
        saveOnMismatch: defaultValues.saveOnMismatch ?? true,
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: ExpectVisualFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Expect Visual Match</DialogTitle>
          <DialogDescription>
            Compare current screenshot with a baseline image for visual
            regression testing using pixelmatch.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 mt-4"
          >
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
              name="comparisonMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comparison Mode</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select comparison mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="baseline">
                        Compare with Local Baseline
                      </SelectItem>
                      <SelectItem value="goldenMaster">
                        Compare with Golden Master
                      </SelectItem>
                      <SelectItem value="createBaseline">
                        Create New Baseline
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose how to perform visual comparison
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {comparisonMode === "baseline" && (
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
            )}

            {comparisonMode === "goldenMaster" && (
              <FormField
                control={form.control}
                name="goldenMasterId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Golden Master</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a golden master" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {goldenMasters?.map((gm) => (
                          <SelectItem key={gm.id} value={gm.id}>
                            {gm.name}
                          </SelectItem>
                        ))}
                        {(!goldenMasters || goldenMasters.length === 0) && (
                          <SelectItem value="" disabled>
                            No golden masters available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select a saved golden master image
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {comparisonMode === "createBaseline" && (
              <FormField
                control={form.control}
                name="baselineName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Baseline Name</FormLabel>
                    <FormControl>
                      <Input placeholder="login-screen" {...field} />
                    </FormControl>
                    <FormDescription>
                      Name for the new baseline image
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {comparisonMode !== "createBaseline" && (
              <>
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
                        Maximum allowed difference ratio. 0.1 = 10% difference
                        allowed.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="saveOnMismatch"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Save Diff on Mismatch</FormLabel>
                        <FormDescription>
                          Save difference image when comparison fails
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </>
            )}

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
