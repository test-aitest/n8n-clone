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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  direction: z.enum(["up", "down"]),
  maxScrolls: z.string().optional(),
});

export type ScrollUntilVisibleFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ScrollUntilVisibleFormValues) => void;
  defaultValues?: Partial<ScrollUntilVisibleFormValues>;
}

export const ScrollUntilVisibleDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const workflowContext = useAtomValue(workflowContextAtom);
  const form = useForm<ScrollUntilVisibleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "scrollResult",
      accessibilityId: defaultValues.accessibilityId || "",
      direction: defaultValues.direction || "down",
      maxScrolls: defaultValues.maxScrolls || "10",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "scrollResult",
        accessibilityId: defaultValues.accessibilityId || "",
        direction: defaultValues.direction || "down",
        maxScrolls: defaultValues.maxScrolls || "10",
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: ScrollUntilVisibleFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scroll Until Visible</DialogTitle>
          <DialogDescription>
            Configure settings to scroll until an element becomes visible.
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
                    <Input placeholder="scrollResult" {...field} />
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
                      placeholder="submitButton"
                    />
                  </FormControl>
                  <FormDescription>
                    The accessibility identifier of the element to find
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="direction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Direction</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select direction" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="up">
                        Up (scroll to see content above)
                      </SelectItem>
                      <SelectItem value="down">
                        Down (scroll to see content below)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>The direction to scroll</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxScrolls"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Scrolls</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="10" {...field} />
                  </FormControl>
                  <FormDescription>
                    Maximum number of scroll attempts (default: 10)
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
