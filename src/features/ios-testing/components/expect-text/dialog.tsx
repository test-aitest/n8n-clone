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

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message: "Variable name must start with a letter or underscore",
    }),
  accessibilityId: z.string().min(1, { message: "Accessibility ID is required" }),
  expectedText: z.string().min(1, { message: "Expected text is required" }),
  matchType: z.enum(["exact", "contains", "regex"]),
  timeout: z.string().optional(),
});

export type ExpectTextFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ExpectTextFormValues) => void;
  defaultValues?: Partial<ExpectTextFormValues>;
}

export const ExpectTextDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const form = useForm<ExpectTextFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "expectText",
      accessibilityId: defaultValues.accessibilityId || "",
      expectedText: defaultValues.expectedText || "",
      matchType: defaultValues.matchType || "exact",
      timeout: defaultValues.timeout || "10000",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "expectText",
        accessibilityId: defaultValues.accessibilityId || "",
        expectedText: defaultValues.expectedText || "",
        matchType: defaultValues.matchType || "exact",
        timeout: defaultValues.timeout || "10000",
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: ExpectTextFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Expect Element Text</DialogTitle>
          <DialogDescription>
            Verify that an element has the expected text content (AXLabel).
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
                    <Input placeholder="expectText" {...field} />
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
                    <Input
                      placeholder="welcomeLabel"
                      {...field}
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
              name="expectedText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Text</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Welcome to the app"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The text content to match against
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="matchType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Match Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select match type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="exact">Exact Match</SelectItem>
                      <SelectItem value="contains">Contains</SelectItem>
                      <SelectItem value="regex">Regular Expression</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    How to compare the expected text with actual text
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
