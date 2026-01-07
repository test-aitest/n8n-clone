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
import { UIElementBrowser } from "../ui-element-browser";

const ELEMENT_TYPES = [
  { value: "Button", label: "Button" },
  { value: "TextField", label: "TextField (Text Input)" },
  { value: "SecureTextField", label: "SecureTextField (Password)" },
  { value: "TextView", label: "TextView (TextEditor)" },
  { value: "Switch", label: "Switch (Toggle)" },
  { value: "Slider", label: "Slider" },
  { value: "Stepper", label: "Stepper" },
  { value: "Picker", label: "Picker" },
  { value: "DatePicker", label: "DatePicker" },
  { value: "StaticText", label: "StaticText (Text/Label)" },
  { value: "Image", label: "Image" },
  { value: "Link", label: "Link" },
  { value: "Cell", label: "Cell (List Item)" },
] as const;

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message: "Variable name must start with a letter or underscore",
    }),
  elementType: z
    .string()
    .min(1, { message: "Element type is required" }),
  accessibilityId: z.string().optional(),
  labelMatch: z.string().optional(),
});

export type TapFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: TapFormValues) => void;
  defaultValues?: Partial<TapFormValues>;
}

export const TapDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const form = useForm<TapFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "tapResult",
      elementType: defaultValues.elementType || "",
      accessibilityId: defaultValues.accessibilityId || "",
      labelMatch: defaultValues.labelMatch || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "tapResult",
        elementType: defaultValues.elementType || "",
        accessibilityId: defaultValues.accessibilityId || "",
        labelMatch: defaultValues.labelMatch || "",
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: TapFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Tap Element</DialogTitle>
          <DialogDescription>
            Configure settings for tapping a UI element.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <FormField
                control={form.control}
                name="variableName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Variable Name</FormLabel>
                    <FormControl>
                      <Input placeholder="tapResult" {...field} />
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
                name="elementType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Element Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select element type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ELEMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The type of UI element to tap
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
                    <FormLabel>Accessibility ID (Optional)</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input placeholder="loginButton" {...field} />
                        <UIElementBrowser
                          onSelect={(id) => form.setValue("accessibilityId", id)}
                          selectedValue={field.value}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Exact accessibility identifier to find the element
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="labelMatch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label Match (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Email address" {...field} />
                    </FormControl>
                    <FormDescription>
                      Text to match in label/placeholder (partial match). Used if Accessibility ID is not set.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="pt-4 border-t mt-4">
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
