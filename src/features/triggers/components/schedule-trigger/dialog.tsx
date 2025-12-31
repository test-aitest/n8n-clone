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

const PRESET_SCHEDULES = [
  { value: "0 * * * *", label: "Every hour" },
  { value: "0 0 * * *", label: "Every day at midnight" },
  { value: "0 9 * * *", label: "Every day at 9:00 AM" },
  { value: "0 0 * * 1", label: "Every Monday at midnight" },
  { value: "0 0 1 * *", label: "First day of every month" },
  { value: "custom", label: "Custom cron expression" },
];

const formSchema = z.object({
  preset: z.string().min(1, { message: "Please select a schedule" }),
  cronExpression: z.string().optional(),
});

export type ScheduleTriggerFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ScheduleTriggerFormValues) => void;
  defaultValues?: Partial<ScheduleTriggerFormValues>;
}

export const ScheduleTriggerDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const form = useForm<ScheduleTriggerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      preset: defaultValues.preset || "0 * * * *",
      cronExpression: defaultValues.cronExpression || "",
    },
  });

  const selectedPreset = form.watch("preset");

  useEffect(() => {
    if (open) {
      form.reset({
        preset: defaultValues.preset || "0 * * * *",
        cronExpression: defaultValues.cronExpression || "",
      });
    }
  }, [open, defaultValues.preset, defaultValues.cronExpression, form.reset]);

  const handleSubmit = (values: ScheduleTriggerFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Trigger</DialogTitle>
          <DialogDescription>
            Configure when this workflow should run automatically.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 mt-4"
          >
            <FormField
              control={form.control}
              name="preset"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schedule</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select schedule" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PRESET_SCHEDULES.map((schedule) => (
                        <SelectItem key={schedule.value} value={schedule.value}>
                          {schedule.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose a preset schedule or create a custom one
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {selectedPreset === "custom" && (
              <FormField
                control={form.control}
                name="cronExpression"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cron Expression</FormLabel>
                    <FormControl>
                      <Input placeholder="*/5 * * * *" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter a cron expression (e.g., */5 * * * * for every 5
                      minutes)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
