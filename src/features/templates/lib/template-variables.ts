/**
 * Template Variable Utilities
 * Functions for working with template variables in workflow definitions
 */

import type { TemplateDefinition, TemplateNode, TemplateEdge } from "./default-templates";

// Variable pattern: {{variableName}}
const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;

/**
 * Extract all variable names from a template definition
 */
export function extractVariables(definition: TemplateDefinition): string[] {
  const variables = new Set<string>();

  function extractFromValue(value: unknown): void {
    if (typeof value === "string") {
      const matches = value.matchAll(VARIABLE_PATTERN);
      for (const match of matches) {
        variables.add(match[1]);
      }
    } else if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(extractFromValue);
      } else {
        Object.values(value).forEach(extractFromValue);
      }
    }
  }

  definition.nodes.forEach((node) => {
    extractFromValue(node.data);
  });

  return Array.from(variables);
}

/**
 * Replace variables in a string
 */
export function replaceVariablesInString(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(VARIABLE_PATTERN, (match, variableName) => {
    const value = variables[variableName];
    // If variable is not provided or empty, keep the placeholder
    return value !== undefined && value !== "" ? value : match;
  });
}

/**
 * Replace variables in an object recursively
 */
export function replaceVariablesInObject<T>(
  obj: T,
  variables: Record<string, string>,
): T {
  if (typeof obj === "string") {
    return replaceVariablesInString(obj, variables) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => replaceVariablesInObject(item, variables)) as T;
  }

  if (typeof obj === "object" && obj !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = replaceVariablesInObject(value, variables);
    }
    return result as T;
  }

  return obj;
}

/**
 * Apply variables to a template definition
 */
export function applyVariablesToTemplate(
  definition: TemplateDefinition,
  variables: Record<string, string>,
): TemplateDefinition {
  return {
    nodes: definition.nodes.map((node) => ({
      ...node,
      data: replaceVariablesInObject(node.data, variables),
    })),
    edges: [...definition.edges],
  };
}

/**
 * Apply project settings to a template
 * This includes deviceId and bundleId from the project
 */
export function applyProjectSettings(
  definition: TemplateDefinition,
  projectSettings: {
    deviceId?: string | null;
    bundleId?: string | null;
  },
): TemplateDefinition {
  const variables: Record<string, string> = {};

  if (projectSettings.deviceId) {
    variables.deviceId = projectSettings.deviceId;
  }

  if (projectSettings.bundleId) {
    variables.bundleId = projectSettings.bundleId;
  }

  return applyVariablesToTemplate(definition, variables);
}

/**
 * Generate unique node IDs for a template definition
 * This ensures node IDs don't conflict when creating workflows
 */
export function generateUniqueNodeIds(
  definition: TemplateDefinition,
): TemplateDefinition {
  const idMapping = new Map<string, string>();

  // Generate new IDs for all nodes
  const newNodes: TemplateNode[] = definition.nodes.map((node) => {
    const newId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    idMapping.set(node.id, newId);
    return {
      ...node,
      id: newId,
    };
  });

  // Update edge references
  const newEdges: TemplateEdge[] = definition.edges.map((edge) => ({
    ...edge,
    id: `edge_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    source: idMapping.get(edge.source) || edge.source,
    target: idMapping.get(edge.target) || edge.target,
  }));

  return {
    nodes: newNodes,
    edges: newEdges,
  };
}

/**
 * Validate that all required variables have values
 */
export function validateRequiredVariables(
  definition: TemplateDefinition,
  variables: Record<string, string>,
  requiredVars?: string[],
): { valid: boolean; missingVariables: string[] } {
  const allVariables = extractVariables(definition);
  const required = requiredVars || allVariables;

  const missingVariables = required.filter(
    (varName) => !variables[varName] || variables[varName].trim() === "",
  );

  return {
    valid: missingVariables.length === 0,
    missingVariables,
  };
}

/**
 * Get unset variables in a definition
 * Returns variables that still have {{variableName}} format
 */
export function getUnsetVariables(definition: TemplateDefinition): string[] {
  return extractVariables(definition);
}

/**
 * Check if a string contains template variables
 */
export function hasVariables(str: string): boolean {
  return VARIABLE_PATTERN.test(str);
}

/**
 * Create a preview of the template with variables highlighted
 */
export function getVariablePreview(
  definition: TemplateDefinition,
): { variableName: string; nodeName: string; field: string }[] {
  const preview: { variableName: string; nodeName: string; field: string }[] = [];

  definition.nodes.forEach((node) => {
    const nodeType = node.type;

    function checkValue(value: unknown, fieldPath: string): void {
      if (typeof value === "string") {
        const matches = value.matchAll(VARIABLE_PATTERN);
        for (const match of matches) {
          preview.push({
            variableName: match[1],
            nodeName: nodeType,
            field: fieldPath,
          });
        }
      } else if (typeof value === "object" && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((item, index) => checkValue(item, `${fieldPath}[${index}]`));
        } else {
          Object.entries(value).forEach(([key, val]) =>
            checkValue(val, fieldPath ? `${fieldPath}.${key}` : key),
          );
        }
      }
    }

    checkValue(node.data, "");
  });

  return preview;
}
