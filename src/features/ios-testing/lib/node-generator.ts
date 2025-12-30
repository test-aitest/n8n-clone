import { createId } from "@paralleldrive/cuid2";
import type { Edge, Node } from "@xyflow/react";
import { NodeType } from "@/generated/prisma/client";

/**
 * UI Component from analysis result
 */
export interface UIComponentInput {
  id: string;
  type: string;
  label: string | null;
  suggestedId: string;
  sourceLocation: {
    line: number;
    column: number;
  };
  parentView: string;
}

/**
 * Generated node output
 */
export interface GeneratedNode extends Node {
  data: {
    accessibilityId: string;
    label: string;
    componentType: string;
    sourceFile?: string;
    sourceLine?: number;
  };
}

/**
 * Layout configuration
 */
interface LayoutConfig {
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  startX: number;
  startY: number;
  nodesPerRow: number;
}

const DEFAULT_LAYOUT: LayoutConfig = {
  nodeWidth: 280,
  nodeHeight: 80,
  horizontalSpacing: 40,
  verticalSpacing: 60,
  startX: 100,
  startY: 200,
  nodesPerRow: 3,
};

/**
 * Map SwiftUI component type to workflow node type
 */
function mapComponentToNodeType(componentType: string): NodeType {
  const mapping: Record<string, NodeType> = {
    Button: NodeType.IOS_TAP,
    TextField: NodeType.IOS_TEXT_INPUT,
    SecureField: NodeType.IOS_TEXT_INPUT,
    Toggle: NodeType.IOS_TOGGLE_SWITCH,
    Slider: NodeType.IOS_SLIDER_SET,
    Picker: NodeType.IOS_PICKER_SELECT,
    DatePicker: NodeType.IOS_PICKER_SELECT,
    NavigationLink: NodeType.IOS_TAP,
    Link: NodeType.IOS_TAP,
    Text: NodeType.IOS_EXPECT_TEXT,
    Label: NodeType.IOS_EXPECT_TEXT,
    Image: NodeType.IOS_EXPECT_EXISTS,
    List: NodeType.IOS_SCROLL_UNTIL_VISIBLE,
    ScrollView: NodeType.IOS_SCROLL_UNTIL_VISIBLE,
  };

  return mapping[componentType] || NodeType.IOS_EXPECT_EXISTS;
}

/**
 * Get default node data for a component type
 */
function getDefaultNodeData(
  nodeType: NodeType,
  component: UIComponentInput,
): Record<string, unknown> {
  const baseData = {
    accessibilityId: component.suggestedId,
    label: component.label || component.type,
    componentType: component.type,
  };

  switch (nodeType) {
    case NodeType.IOS_TAP:
      return {
        ...baseData,
        timeout: 5000,
      };
    case NodeType.IOS_TEXT_INPUT:
      return {
        ...baseData,
        text: "",
        clearFirst: true,
        timeout: 5000,
      };
    case NodeType.IOS_TOGGLE_SWITCH:
      return {
        ...baseData,
        targetState: true,
        timeout: 5000,
      };
    case NodeType.IOS_SLIDER_SET:
      return {
        ...baseData,
        value: 0.5,
        timeout: 5000,
      };
    case NodeType.IOS_PICKER_SELECT:
      return {
        ...baseData,
        value: "",
        timeout: 5000,
      };
    case NodeType.IOS_EXPECT_TEXT:
      return {
        ...baseData,
        expectedText: component.label || "",
        matchType: "contains",
        timeout: 5000,
      };
    case NodeType.IOS_EXPECT_EXISTS:
      return {
        ...baseData,
        timeout: 5000,
      };
    case NodeType.IOS_SCROLL_UNTIL_VISIBLE:
      return {
        ...baseData,
        direction: "down",
        maxScrolls: 10,
        timeout: 30000,
      };
    default:
      return baseData;
  }
}

/**
 * Calculate node position using grid layout
 */
function calculatePosition(
  index: number,
  layout: LayoutConfig,
): { x: number; y: number } {
  const row = Math.floor(index / layout.nodesPerRow);
  const col = index % layout.nodesPerRow;

  return {
    x: layout.startX + col * (layout.nodeWidth + layout.horizontalSpacing),
    y: layout.startY + row * (layout.nodeHeight + layout.verticalSpacing),
  };
}

/**
 * Generate workflow nodes from UI components
 */
export function generateNodesFromComponents(
  components: UIComponentInput[],
  existingNodes: Node[] = [],
  options: Partial<LayoutConfig> = {},
): { nodes: Node[]; edges: Edge[] } {
  const layout = { ...DEFAULT_LAYOUT, ...options };

  // Filter out components that already have nodes
  const existingAccessibilityIds = new Set(
    existingNodes
      .filter((n) => n.data?.accessibilityId)
      .map((n) => n.data.accessibilityId as string),
  );

  const newComponents = components.filter(
    (c) => !existingAccessibilityIds.has(c.suggestedId),
  );

  // Calculate starting index based on existing nodes
  const startIndex = existingNodes.length;

  // Generate new nodes
  const newNodes: Node[] = newComponents.map((component, index) => {
    const nodeType = mapComponentToNodeType(component.type);
    const position = calculatePosition(startIndex + index, layout);
    const nodeData = getDefaultNodeData(nodeType, component);

    return {
      id: createId(),
      type: nodeType,
      position,
      data: nodeData,
    };
  });

  // Generate sequential edges between new nodes
  const edges: Edge[] = [];
  for (let i = 0; i < newNodes.length - 1; i++) {
    edges.push({
      id: createId(),
      source: newNodes[i].id,
      target: newNodes[i + 1].id,
    });
  }

  // Connect last existing node to first new node
  if (existingNodes.length > 0 && newNodes.length > 0) {
    const lastExisting = existingNodes[existingNodes.length - 1];
    edges.unshift({
      id: createId(),
      source: lastExisting.id,
      target: newNodes[0].id,
    });
  }

  return {
    nodes: [...existingNodes, ...newNodes],
    edges,
  };
}

/**
 * Group components by view name for organized layout
 */
export function groupComponentsByView(
  components: UIComponentInput[],
): Map<string, UIComponentInput[]> {
  const groups = new Map<string, UIComponentInput[]>();

  for (const component of components) {
    const viewName = component.parentView;
    const existing = groups.get(viewName) || [];
    existing.push(component);
    groups.set(viewName, existing);
  }

  return groups;
}

/**
 * Generate a test flow from components
 * Creates: Boot -> App Launch -> [Component Interactions] -> Screenshot
 */
export function generateTestFlow(
  components: UIComponentInput[],
  options: {
    simulatorId?: string;
    bundleId?: string;
    appPath?: string;
  } = {},
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // 1. Add Simulator Boot node
  const bootNode: Node = {
    id: createId(),
    type: NodeType.IOS_SIMULATOR_BOOT,
    position: { x: 100, y: 100 },
    data: {
      deviceId: options.simulatorId || "",
    },
  };
  nodes.push(bootNode);

  // 2. Add App Launch node
  const launchNode: Node = {
    id: createId(),
    type: NodeType.IOS_APP_LAUNCH,
    position: { x: 100, y: 220 },
    data: {
      bundleId: options.bundleId || "",
      launchArguments: "",
    },
  };
  nodes.push(launchNode);
  edges.push({
    id: createId(),
    source: bootNode.id,
    target: launchNode.id,
  });

  // 3. Add component interaction nodes
  let prevNodeId = launchNode.id;
  let yPosition = 340;

  for (const component of components) {
    const nodeType = mapComponentToNodeType(component.type);
    const nodeData = getDefaultNodeData(nodeType, component);

    const node: Node = {
      id: createId(),
      type: nodeType,
      position: { x: 100, y: yPosition },
      data: nodeData,
    };
    nodes.push(node);
    edges.push({
      id: createId(),
      source: prevNodeId,
      target: node.id,
    });

    prevNodeId = node.id;
    yPosition += 120;
  }

  // 4. Add Screenshot node at the end
  const screenshotNode: Node = {
    id: createId(),
    type: NodeType.IOS_SCREENSHOT,
    position: { x: 100, y: yPosition },
    data: {
      filename: "test_result",
    },
  };
  nodes.push(screenshotNode);
  edges.push({
    id: createId(),
    source: prevNodeId,
    target: screenshotNode.id,
  });

  return { nodes, edges };
}

/**
 * Validate generated nodes
 */
export function validateGeneratedNodes(nodes: Node[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (const node of nodes) {
    // Check required accessibilityId for iOS interaction nodes
    const iosInteractionTypes: NodeType[] = [
      NodeType.IOS_TAP,
      NodeType.IOS_TEXT_INPUT,
      NodeType.IOS_TOGGLE_SWITCH,
      NodeType.IOS_SLIDER_SET,
      NodeType.IOS_PICKER_SELECT,
      NodeType.IOS_EXPECT_EXISTS,
      NodeType.IOS_EXPECT_TEXT,
      NodeType.IOS_EXPECT_VALUE,
    ];

    if (
      iosInteractionTypes.includes(node.type as NodeType) &&
      !node.data?.accessibilityId
    ) {
      errors.push(`Node ${node.id} (${node.type}) is missing accessibilityId`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
