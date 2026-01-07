"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Search } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DeviceSelector } from "../device-selector";
import { fetchXcodeTeams, type XcodeTeam } from "./actions";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message: "Variable name must start with a letter or underscore",
    }),
  deviceId: z.string().min(1, { message: "Device ID is required" }),
  teamId: z.string().min(1, { message: "Team ID is required" }),
  signingId: z.string().optional(),
});

export type WdaSetupFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: WdaSetupFormValues) => void;
  defaultValues?: Partial<WdaSetupFormValues>;
}

export const WdaSetupDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const [teams, setTeams] = useState<XcodeTeam[]>([]);
  const [isSearching, startSearching] = useTransition();
  const [popoverOpen, setPopoverOpen] = useState(false);

  const form = useForm<WdaSetupFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "wdaSetupResult",
      deviceId: defaultValues.deviceId || "",
      teamId: defaultValues.teamId || "",
      signingId: defaultValues.signingId || "Apple Development",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "wdaSetupResult",
        deviceId: defaultValues.deviceId || "",
        teamId: defaultValues.teamId || "",
        signingId: defaultValues.signingId || "Apple Development",
      });
      setTeams([]);
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: WdaSetupFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  const handleSearchTeamId = () => {
    startSearching(async () => {
      const result = await fetchXcodeTeams();
      setTeams(result);
      setPopoverOpen(true);
    });
  };

  const handleSelectTeam = (team: XcodeTeam) => {
    form.setValue("teamId", team.teamId);
    form.setValue("signingId", "Apple Development");
    setPopoverOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>WDA Setup</DialogTitle>
          <DialogDescription>
            Build and install WebDriverAgent on a physical iOS device for UI
            automation. This is required once per device before running UI
            tests.
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
                    <Input placeholder="wdaSetupResult" {...field} />
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
                    Physical device UDID. Click the search button to find
                    connected devices.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="teamId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apple Developer Team ID</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input
                        placeholder="XXXXXXXXXX"
                        {...field}
                        className="flex-1"
                      />
                      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleSearchTeamId}
                            disabled={isSearching}
                          >
                            {isSearching ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Search className="h-4 w-4" />
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-80 p-0"
                          align="end"
                          side="bottom"
                          sideOffset={4}
                          avoidCollisions={false}
                        >
                          <div className="p-2 border-b">
                            <p className="text-sm font-medium">Xcode Teams</p>
                            <p className="text-xs text-muted-foreground">
                              Select a Team ID from Xcode Accounts
                            </p>
                          </div>
                          <div
                            className="overflow-y-auto overscroll-contain"
                            style={{ maxHeight: "240px" }}
                            onWheel={(e) => e.stopPropagation()}
                          >
                            {teams.length === 0 ? (
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                No Xcode teams found.
                                <br />
                                Add your Apple ID in Xcode → Settings → Accounts
                              </div>
                            ) : (
                              <div className="p-1">
                                {teams.map((team) => (
                                  <button
                                    key={team.teamId}
                                    type="button"
                                    className="w-full flex items-start gap-3 p-2 rounded-md text-left hover:bg-accent transition-colors"
                                    onClick={() => handleSelectTeam(team)}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-medium font-mono">
                                          {team.teamId}
                                        </p>
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                          {team.type === "personal"
                                            ? "Personal"
                                            : "Organization"}
                                        </span>
                                      </div>
                                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                                        {team.name} ({team.email})
                                      </p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Click search to find Team IDs from Xcode. Personal Team
                    (free) works but requires re-signing every 7 days.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="signingId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Signing Identity (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Apple Development" {...field} />
                  </FormControl>
                  <FormDescription>
                    Code signing identity. Default: "Apple Development"
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
