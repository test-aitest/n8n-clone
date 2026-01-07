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
import { DeviceSelector } from "../device-selector";

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

export type DeviceAppLaunchFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: DeviceAppLaunchFormValues) => void;
  defaultValues?: Partial<DeviceAppLaunchFormValues>;
}

export const DeviceAppLaunchDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const form = useForm<DeviceAppLaunchFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "deviceLaunchResult",
      deviceId: defaultValues.deviceId || "",
      bundleId: defaultValues.bundleId || "",
      args: defaultValues.args || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "deviceLaunchResult",
        deviceId: defaultValues.deviceId || "",
        bundleId: defaultValues.bundleId || "",
        args: defaultValues.args || "",
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: DeviceAppLaunchFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Device App Launch</DialogTitle>
          <DialogDescription>
            Launch an app on a physical iOS device (iOS 17+).
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
                    <Input placeholder="deviceLaunchResult" {...field} />
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
                    <DeviceSelector
                      value={field.value}
                      onChange={field.onChange}
                      deviceFilter="physical"
                    />
                  </FormControl>
                  <FormDescription>
                    Physical device UDID. Click the search button to find connected devices.
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
                    <Input placeholder="com.example.myapp" {...field} />
                  </FormControl>
                  <FormDescription>
                    The bundle identifier of the app to launch.
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
