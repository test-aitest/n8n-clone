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
  deviceId: z.string().min(1, { message: "Device ID is required" }),
  appPath: z.string().min(1, { message: "App path is required" }),
});

export type AppInstallFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AppInstallFormValues) => void;
  defaultValues?: Partial<AppInstallFormValues>;
}

export const AppInstallDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const form = useForm<AppInstallFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "installResult",
      deviceId: defaultValues.deviceId || "",
      appPath: defaultValues.appPath || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "installResult",
        deviceId: defaultValues.deviceId || "",
        appPath: defaultValues.appPath || "",
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: AppInstallFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>App Install</DialogTitle>
          <DialogDescription>
            Install an app on the iOS Simulator.
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
                    <Input placeholder="installResult" {...field} />
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
              name="appPath"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>App Path</FormLabel>
                  <FormControl>
                    <Input placeholder="/path/to/MyApp.app" {...field} />
                  </FormControl>
                  <FormDescription>
                    Path to the .app bundle to install
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
