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

const formSchema = z.object({
  delay: z.string().min(1, { message: "Delay is required" }),
  unit: z.enum(["seconds", "minutes", "hours"]),
});

export type IntervalTriggerFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: IntervalTriggerFormValues) => void;
  defaultValues?: Partial<IntervalTriggerFormValues>;
}

export const IntervalTriggerDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const form = useForm<IntervalTriggerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      delay: defaultValues.delay || "10",
      unit: defaultValues.unit || "seconds",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        delay: defaultValues.delay || "10",
        unit: defaultValues.unit || "seconds",
      });
    }
  }, [open, defaultValues.delay, defaultValues.unit, form.reset]);

  const watchedDelay = form.watch("delay");
  const watchedUnit = form.watch("unit");

  const handleSubmit = (values: IntervalTriggerFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delay Trigger</DialogTitle>
          <DialogDescription>
            Execute the workflow after a specified delay.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 mt-4"
          >
            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="delay"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Delay</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" placeholder="10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="seconds">Seconds</SelectItem>
                        <SelectItem value="minutes">Minutes</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormDescription>
              The workflow will start after {watchedDelay || "10"}{" "}
              {watchedUnit || "seconds"}
            </FormDescription>
            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
