/**
 * Template Router
 * tRPC endpoints for template management
 */

import { z } from "zod";
import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { NodeType, type Prisma } from "@/generated/prisma/client";
import {
  DEFAULT_TEMPLATES,
  getDefaultTemplateById,
  type TemplateDefinition,
} from "../lib/default-templates";
import {
  applyVariablesToTemplate,
  applyProjectSettings,
  generateUniqueNodeIds,
  extractVariables,
  getVariablesWithUsage,
} from "../lib/template-variables";

export const templatesRouter = createTRPCRouter({
  /**
   * List all templates (default + custom for project)
   */
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        category: z.enum(["all", "default", "custom"]).default("all"),
        search: z.string().default(""),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { projectId, category, search } = input;

      // Start with default templates
      let templates: Array<{
        id: string;
        name: string;
        description: string | null;
        category: string;
        tags: string[];
        isDefault: boolean;
        projectId: string | null;
      }> = [];

      if (category === "all" || category === "default") {
        const filteredDefaults = DEFAULT_TEMPLATES.filter((t) => {
          if (!search) return true;
          const searchLower = search.toLowerCase();
          return (
            t.name.toLowerCase().includes(searchLower) ||
            t.description.toLowerCase().includes(searchLower) ||
            t.tags.some((tag) => tag.toLowerCase().includes(searchLower))
          );
        }).map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          category: "default" as const,
          tags: t.tags,
          isDefault: true,
          projectId: null,
        }));

        templates = [...filteredDefaults];
      }

      // Add custom templates from database
      if (category === "all" || category === "custom") {
        const customTemplates = await prisma.template.findMany({
          where: {
            userId: ctx.auth.user.id,
            ...(projectId && { projectId }),
            ...(search && {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                {
                  description: { contains: search, mode: "insensitive" as const },
                },
              ],
            }),
          },
          orderBy: { createdAt: "desc" },
        });

        templates = [
          ...templates,
          ...customTemplates.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            category: t.category,
            tags: t.tags,
            isDefault: false,
            projectId: t.projectId,
          })),
        ];
      }

      return templates;
    }),

  /**
   * Get a single template by ID
   */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Check if it's a default template
      const defaultTemplate = getDefaultTemplateById(input.id);
      if (defaultTemplate) {
        return {
          id: defaultTemplate.id,
          name: defaultTemplate.name,
          description: defaultTemplate.description,
          category: "default",
          tags: defaultTemplate.tags,
          definition: defaultTemplate.definition as unknown as Prisma.JsonValue,
          defaultVariables:
            defaultTemplate.defaultVariables as unknown as Prisma.JsonValue,
          includesSimulatorConfig: defaultTemplate.includesSimulatorConfig,
          isDefault: true,
          projectId: null,
          userId: null,
        };
      }

      // Otherwise fetch from database
      const template = await prisma.template.findUniqueOrThrow({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
      });

      return {
        ...template,
        isDefault: false,
      };
    }),

  /**
   * Create a workflow from a template
   */
  createWorkflowFromTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.string(),
        projectId: z.string(),
        name: z.string().min(1),
        variables: z.record(z.string(), z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { templateId, projectId, name, variables = {} } = input;

      // Get template definition
      let definition: TemplateDefinition;
      let includesSimulatorConfig = true;

      const defaultTemplate = getDefaultTemplateById(templateId);
      if (defaultTemplate) {
        definition = defaultTemplate.definition;
        includesSimulatorConfig = defaultTemplate.includesSimulatorConfig;
      } else {
        const template = await prisma.template.findUniqueOrThrow({
          where: {
            id: templateId,
            userId: ctx.auth.user.id,
          },
        });
        definition = template.definition as unknown as TemplateDefinition;
        includesSimulatorConfig = template.includesSimulatorConfig;
      }

      // Get project for settings
      const project = await prisma.project.findUniqueOrThrow({
        where: {
          id: projectId,
          userId: ctx.auth.user.id,
        },
      });

      // Apply project settings if template includes simulator config
      if (includesSimulatorConfig) {
        definition = applyProjectSettings(definition, {
          deviceId: project.targetDeviceId,
          bundleId: project.bundleId,
        });
      }

      // Apply user-provided variables
      definition = applyVariablesToTemplate(definition, variables);

      // Generate unique node IDs
      definition = generateUniqueNodeIds(definition);

      // Create workflow
      const workflow = await prisma.workflow.create({
        data: {
          name,
          userId: ctx.auth.user.id,
          projectId,
          templateId,
          targetAppPath: project.appPath,
          bundleId: project.bundleId,
          targetDeviceId: project.targetDeviceId,
        },
      });

      // Create nodes
      await prisma.node.createMany({
        data: definition.nodes.map((node) => ({
          id: node.id,
          workflowId: workflow.id,
          name: node.type,
          type: node.type as NodeType,
          position: node.position as Prisma.InputJsonValue,
          data: node.data as Prisma.InputJsonValue,
        })),
      });

      // Create connections
      if (definition.edges.length > 0) {
        await prisma.connection.createMany({
          data: definition.edges.map((edge) => ({
            workflowId: workflow.id,
            fromNodeId: edge.source,
            toNodeId: edge.target,
            fromOutput: edge.sourceHandle || "main",
            toInput: edge.targetHandle || "main",
          })),
        });
      }

      return workflow;
    }),

  /**
   * Create a custom template from an existing workflow
   */
  createFromWorkflow: protectedProcedure
    .input(
      z.object({
        workflowId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { workflowId, name, description, tags = [] } = input;

      // Get workflow with nodes and connections
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: {
          id: workflowId,
          userId: ctx.auth.user.id,
        },
        include: {
          nodes: true,
          connections: true,
        },
      });

      // Create template definition from workflow
      const definition: TemplateDefinition = {
        nodes: workflow.nodes.map((node) => ({
          id: node.id,
          type: node.type,
          position: node.position as { x: number; y: number },
          data: (node.data as Record<string, unknown>) || {},
        })),
        edges: workflow.connections.map((conn) => ({
          id: conn.id,
          source: conn.fromNodeId,
          target: conn.toNodeId,
          sourceHandle: conn.fromOutput,
          targetHandle: conn.toInput,
        })),
      };

      // Extract variables from the definition
      const variables = extractVariables(definition);
      const defaultVariables: Record<string, string> = {};
      variables.forEach((v) => {
        defaultVariables[v] = "";
      });

      // Create template
      const template = await prisma.template.create({
        data: {
          name,
          description,
          projectId: workflow.projectId,
          userId: ctx.auth.user.id,
          definition: definition as unknown as Prisma.InputJsonValue,
          category: "custom",
          tags,
          includesSimulatorConfig: true,
          defaultVariables:
            defaultVariables as unknown as Prisma.InputJsonValue,
        },
      });

      return template;
    }),

  /**
   * Update a custom template
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Default templates cannot be updated
      if (getDefaultTemplateById(id)) {
        throw new Error("Cannot update default templates");
      }

      return prisma.template.update({
        where: {
          id,
          userId: ctx.auth.user.id,
        },
        data,
      });
    }),

  /**
   * Delete a custom template
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Default templates cannot be deleted
      if (getDefaultTemplateById(input.id)) {
        throw new Error("Cannot delete default templates");
      }

      return prisma.template.delete({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
      });
    }),

  /**
   * Get template variables with usage information
   */
  getVariables: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const defaultTemplate = getDefaultTemplateById(input.id);
      if (defaultTemplate) {
        const variablesWithUsage = getVariablesWithUsage(defaultTemplate.definition);
        return {
          variables: Object.keys(defaultTemplate.defaultVariables),
          defaults: defaultTemplate.defaultVariables,
          variablesWithUsage,
        };
      }

      const template = await prisma.template.findUniqueOrThrow({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
      });

      const definition = template.definition as unknown as TemplateDefinition;
      const variables = extractVariables(definition);
      const variablesWithUsage = getVariablesWithUsage(definition);

      return {
        variables,
        defaults: (template.defaultVariables as Record<string, string>) || {},
        variablesWithUsage,
      };
    }),

  /**
   * List default templates only
   */
  listDefaults: protectedProcedure.query(() => {
    return DEFAULT_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      tags: t.tags,
    }));
  }),
});
