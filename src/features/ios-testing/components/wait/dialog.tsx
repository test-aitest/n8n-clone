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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z
  .object({
    variableName: z
      .string()
      .min(1, { message: "Variable name is required" })
      .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
        message: "Variable name must start with a letter or underscore",
      }),
    waitType: z.enum(["duration", "element"]),
    duration: z.string().optional(),
    accessibilityId: z.string().optional(),
    timeout: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.waitType === "duration") {
        return data.duration && data.duration.length > 0;
      }
      if (data.waitType === "element") {
        return data.accessibilityId && data.accessibilityId.length > 0;
      }
      return true;
    },
    {
      message:
        "Duration is required for duration wait, Accessibility ID is required for element wait",
      path: ["duration"],
    },
  );

export type WaitFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: WaitFormValues) => void;
  defaultValues?: Partial<WaitFormValues>;
}

export const WaitDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const form = useForm<WaitFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "waitResult",
      waitType: defaultValues.waitType || "duration",
      duration: defaultValues.duration || "1000",
      accessibilityId: defaultValues.accessibilityId || "",
      timeout: defaultValues.timeout || "10000",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "waitResult",
        waitType: defaultValues.waitType || "duration",
        duration: defaultValues.duration || "1000",
        accessibilityId: defaultValues.accessibilityId || "",
        timeout: defaultValues.timeout || "10000",
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: WaitFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  const waitType = form.watch("waitType");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Wait</DialogTitle>
          <DialogDescription>
            Configure settings to wait for a duration or until an element
            appears.
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
                    <Input placeholder="waitResult" {...field} />
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
              name="waitType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wait Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select wait type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="duration">
                        Wait for duration
                      </SelectItem>
                      <SelectItem value="element">Wait for element</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose to wait for a fixed duration or until an element
                    appears
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {waitType === "duration" && (
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (ms)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="1000" {...field} />
                    </FormControl>
                    <FormDescription>
                      How long to wait in milliseconds
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {waitType === "element" && (
              <>
                <FormField
                  control={form.control}
                  name="accessibilityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accessibility ID</FormLabel>
                      <FormControl>
                        <Input placeholder="loadingSpinner" {...field} />
                      </FormControl>
                      <FormDescription>
                        Wait until this element appears on screen
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
                        Maximum time to wait for element (default: 10s)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
