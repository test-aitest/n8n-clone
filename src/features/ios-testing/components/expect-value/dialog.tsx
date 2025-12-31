"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { useAtomValue } from "jotai";
import { Button } from "@/components/ui/button";
import { UIComponentSelector } from "@/features/templates/components/ui-component-selector";
import { workflowContextAtom } from "@/features/editor/store/atoms";
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
  accessibilityId: z
    .string()
    .min(1, { message: "Accessibility ID is required" }),
  expectedValue: z.string().min(1, { message: "Expected value is required" }),
  timeout: z.string().optional(),
});

export type ExpectValueFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ExpectValueFormValues) => void;
  defaultValues?: Partial<ExpectValueFormValues>;
}

export const ExpectValueDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const workflowContext = useAtomValue(workflowContextAtom);
  const form = useForm<ExpectValueFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "expectValue",
      accessibilityId: defaultValues.accessibilityId || "",
      expectedValue: defaultValues.expectedValue || "",
      timeout: defaultValues.timeout || "10000",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "expectValue",
        accessibilityId: defaultValues.accessibilityId || "",
        expectedValue: defaultValues.expectedValue || "",
        timeout: defaultValues.timeout || "10000",
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: ExpectValueFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Expect Element Value</DialogTitle>
          <DialogDescription>
            Verify that an element has the expected value (AXValue). Useful for
            checking text field contents, switch states, slider values, etc.
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
                    <Input placeholder="expectValue" {...field} />
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
              name="accessibilityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Accessibility ID</FormLabel>
                  <FormControl>
                    <UIComponentSelector
                      value={field.value}
                      onChange={field.onChange}
                      projectId={workflowContext?.projectId || null}
                      placeholder="usernameField"
                    />
                  </FormControl>
                  <FormDescription>
                    The accessibility identifier of the element to check
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expectedValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Value</FormLabel>
                  <FormControl>
                    <Input placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    The AXValue to match (e.g., text field content, "1" for ON
                    switch)
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
                    Maximum time to wait for element to appear (default: 10s)
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
