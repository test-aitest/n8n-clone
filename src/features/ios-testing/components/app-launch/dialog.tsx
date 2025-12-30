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
  deviceId: z.string().min(1, { message: "Device ID is required" }),
  bundleId: z.string().min(1, { message: "Bundle ID is required" }),
  args: z.string().optional(),
});

export type AppLaunchFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AppLaunchFormValues) => void;
  defaultValues?: Partial<AppLaunchFormValues>;
}

export const AppLaunchDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const form = useForm<AppLaunchFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "launchResult",
      deviceId: defaultValues.deviceId || "",
      bundleId: defaultValues.bundleId || "",
      args: defaultValues.args || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "launchResult",
        deviceId: defaultValues.deviceId || "",
        bundleId: defaultValues.bundleId || "",
        args: defaultValues.args || "",
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: AppLaunchFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>App Launch</DialogTitle>
          <DialogDescription>
            Launch an app on the iOS Simulator.
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
                    <Input placeholder="launchResult" {...field} />
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
              name="deviceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Device ID (UDID)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Simulator UDID. Use `xcrun simctl list devices` to find.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bundleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bundle ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="com.example.MyApp"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The bundle identifier of the app to launch
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="args"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Launch Arguments (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="-argument1 value1 -argument2 value2"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Space-separated launch arguments to pass to the app
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
