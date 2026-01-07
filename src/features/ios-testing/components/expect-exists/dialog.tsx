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
  labelMatch: z.string().optional(),
  timeout: z.string().optional(),
});

export type ExpectExistsFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ExpectExistsFormValues) => void;
  defaultValues?: Partial<ExpectExistsFormValues>;
}

export const ExpectExistsDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const form = useForm<ExpectExistsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "expectExists",
      elementType: defaultValues.elementType || "",
      labelMatch: defaultValues.labelMatch || "",
      timeout: defaultValues.timeout || "10000",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "expectExists",
        elementType: defaultValues.elementType || "",
        labelMatch: defaultValues.labelMatch || "",
        timeout: defaultValues.timeout || "10000",
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: ExpectExistsFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Expect Element Exists</DialogTitle>
          <DialogDescription>
            Verify that an element exists in the UI hierarchy.
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
                    <Input placeholder="expectExists" {...field} />
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
                    The type of UI element to check
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
                  <FormLabel>Label Match</FormLabel>
                  <FormControl>
                    <Input placeholder="Login" {...field} />
                  </FormControl>
                  <FormDescription>
                    Text to match in label/placeholder (partial match)
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
