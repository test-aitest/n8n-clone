/**
 * XML Parser for WDA Page Source
 * Extracts UI elements from iOS page source XML
 */

export interface ParsedUIElement {
  accessibilityId: string;
  componentType: string; // Button, TextField, etc.
  label: string | null;
  positionX: number | null;
  positionY: number | null;
}

/**
 * Parse WDA page source XML and extract UI elements with accessibility identifiers
 */
export function parsePageSourceXML(pageSource: string): ParsedUIElement[] {
  const elements: ParsedUIElement[] = [];
  const seenIds = new Set<string>();

  // Match XCUIElementType elements with their attributes
  // XML format: <XCUIElementTypeButton type="XCUIElementTypeButton" name="loginButton" label="Login" x="100" y="200" .../>
  const elementRegex =
    /<XCUIElementType(\w+)[^>]*?\s+name="([^"]+)"[^>]*?(?:\s+label="([^"]*)")?[^>]*?(?:\s+x="(\d+)")?[^>]*?(?:\s+y="(\d+)")?[^>]*/g;

  let match: RegExpExecArray | null;
  while ((match = elementRegex.exec(pageSource)) !== null) {
    const [, componentType, accessibilityId, label, x, y] = match;

    // Skip duplicates based on accessibilityId
    if (seenIds.has(accessibilityId)) continue;
    seenIds.add(accessibilityId);

    // Skip system elements and file references
    if (
      accessibilityId.startsWith("file:") ||
      accessibilityId.startsWith("_")
    ) {
      continue;
    }

    elements.push({
      accessibilityId,
      componentType,
      label: label || null,
      positionX: x ? Number.parseFloat(x) : null,
      positionY: y ? Number.parseFloat(y) : null,
    });
  }

  // Also try alternative XML format where name might come before type
  const altRegex =
    /name="([^"]+)"[^>]*?type="XCUIElementType(\w+)"[^>]*?(?:label="([^"]*)")?[^>]*?(?:x="(\d+)")?[^>]*?(?:y="(\d+)")?/g;

  while ((match = altRegex.exec(pageSource)) !== null) {
    const [, accessibilityId, componentType, label, x, y] = match;

    // Skip duplicates
    if (seenIds.has(accessibilityId)) continue;
    seenIds.add(accessibilityId);

    // Skip system elements
    if (
      accessibilityId.startsWith("file:") ||
      accessibilityId.startsWith("_")
    ) {
      continue;
    }

    elements.push({
      accessibilityId,
      componentType,
      label: label || null,
      positionX: x ? Number.parseFloat(x) : null,
      positionY: y ? Number.parseFloat(y) : null,
    });
  }

  return elements;
}

/**
 * Extract element counts by type from parsed elements
 */
export function getElementCountsByType(
  elements: ParsedUIElement[]
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const element of elements) {
    counts[element.componentType] = (counts[element.componentType] || 0) + 1;
  }

  return counts;
}
