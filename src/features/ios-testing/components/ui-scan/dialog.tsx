"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message: "Variable name must start with a letter or underscore",
    }),
  timeout: z.string().optional(),
  screenName: z.string().optional(),
});

export type UiScanFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: UiScanFormValues) => void;
  defaultValues?: Partial<UiScanFormValues>;
}

export const UiScanDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const form = useForm<UiScanFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "uiScan",
      timeout: defaultValues.timeout || "30000",
      screenName: defaultValues.screenName || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "uiScan",
        timeout: defaultValues.timeout || "30000",
        screenName: defaultValues.screenName || "",
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: UiScanFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>UI Scan</DialogTitle>
          <DialogDescription>
            Scan the complete UI hierarchy of the current screen. Returns
            detailed information about all UI elements including accessibility
            identifiers, labels, values, and positions.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 mt-4"
          >
            <FormField
              control={form.control}
              name="screenName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>画面名</FormLabel>
                  <FormControl>
                    <Input placeholder="ログイン画面" {...field} />
                  </FormControl>
                  <FormDescription>
                    この画面の名前を設定します。要素選択時に画面でフィルタリングできます。
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input placeholder="uiScan" {...field} />
                  </FormControl>
                  <FormDescription>
                    Reference this result in other nodes. The hierarchy will be
                    available as {`{{variableName.hierarchy}}`}
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
                    <Input type="number" placeholder="30000" {...field} />
                  </FormControl>
                  <FormDescription>
                    Maximum time for scanning UI (default: 30s)
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
