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
  value: z.string().min(1, { message: "Value is required" }),
});

export type PickerSelectFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PickerSelectFormValues) => void;
  defaultValues?: Partial<PickerSelectFormValues>;
}

export const PickerSelectDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const workflowContext = useAtomValue(workflowContextAtom);
  const form = useForm<PickerSelectFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "pickerResult",
      accessibilityId: defaultValues.accessibilityId || "",
      value: defaultValues.value || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "pickerResult",
        accessibilityId: defaultValues.accessibilityId || "",
        value: defaultValues.value || "",
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: PickerSelectFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Picker Select</DialogTitle>
          <DialogDescription>
            Configure settings to select a value in a picker.
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
                    <Input placeholder="pickerResult" {...field} />
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
                      placeholder="countryPicker"
                    />
                  </FormControl>
                  <FormDescription>
                    The accessibility identifier of the picker element
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Value</FormLabel>
                  <FormControl>
                    <Input placeholder="United States" {...field} />
                  </FormControl>
                  <FormDescription>
                    The value to select in the picker
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
