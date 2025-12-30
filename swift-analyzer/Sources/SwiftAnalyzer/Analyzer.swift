import Foundation
import SwiftSyntax
import SwiftParser

/// Analyzes Swift source code to detect SwiftUI components
public final class SwiftUIAnalyzer {
    private let source: String
    private let filePath: String

    public init(source: String, filePath: String) {
        self.source = source
        self.filePath = filePath
    }

    /// Analyze the source code and return detected components
    public func analyze() -> AnalysisResult {
        let sourceFile: SourceFileSyntax = Parser.parse(source: source)
        let visitor: SwiftUIComponentVisitor = SwiftUIComponentVisitor(viewMode: .sourceAccurate)
        visitor.walk(sourceFile)

        let components = visitor.components
        let componentsNeedingIds = components.filter { !$0.hasAccessibilityId }

        return AnalysisResult(
            filePath: filePath,
            components: components,
            componentsNeedingIds: componentsNeedingIds,
            totalCount: components.count,
            withAccessibilityIdCount: components.count - componentsNeedingIds.count,
            timestamp: ISO8601DateFormatter().string(from: Date())
        )
    }
}

/// AST Visitor to detect SwiftUI components
final class SwiftUIComponentVisitor: SyntaxVisitor {
    var components: [UIComponent] = []
    private var currentViewName: String = "Unknown"
    private var componentCounter: [String: Int] = [:]

    override func visit(_ node: StructDeclSyntax) -> SyntaxVisitorContinueKind {
        // Track current view name (struct name)
        currentViewName = node.name.text
        return .visitChildren
    }

    override func visitPost(_ node: StructDeclSyntax) {
        currentViewName = "Unknown"
    }

    override func visit(_ node: FunctionCallExprSyntax) -> SyntaxVisitorContinueKind {
        // Check if this is a SwiftUI component initializer
        guard let componentType = extractComponentType(from: node) else {
            return .visitChildren
        }

        // Extract label from arguments
        let label = extractLabel(from: node)

        // Check for existing accessibilityIdentifier
        let (hasAccessibilityId, existingId) = checkAccessibilityIdentifier(node)

        // Generate unique ID
        let suggestedId = generateAccessibilityId(
            viewName: currentViewName,
            componentType: componentType,
            label: label
        )

        // Get source location
        let location = extractSourceLocation(from: node)

        let component = UIComponent(
            id: suggestedId,
            type: componentType,
            label: label,
            hasAccessibilityId: hasAccessibilityId,
            existingAccessibilityId: existingId,
            sourceLocation: location,
            parentView: currentViewName,
            suggestedId: suggestedId
        )

        components.append(component)

        return .visitChildren
    }

    // MARK: - Private Helpers

    private func extractComponentType(from node: FunctionCallExprSyntax) -> String? {
        // Get the callee expression (e.g., "Button", "TextField", etc.)
        let calleeName: String

        if let identifier = node.calledExpression.as(DeclReferenceExprSyntax.self) {
            calleeName = identifier.baseName.text
        } else if let member = node.calledExpression.as(MemberAccessExprSyntax.self) {
            calleeName = member.declName.baseName.text
        } else {
            return nil
        }

        // Check if it's a known SwiftUI component
        guard SwiftUIComponentType.allCases.contains(where: { $0.rawValue == calleeName }) else {
            return nil
        }

        return calleeName
    }

    private func extractLabel(from node: FunctionCallExprSyntax) -> String? {
        // Look for string literals in the arguments
        for argument in node.arguments {
            if let stringLiteral = findStringLiteral(in: argument.expression) {
                return stringLiteral
            }
        }

        // Also check trailing closure for Text
        if let trailingClosure = node.trailingClosure {
            for statement in trailingClosure.statements {
                if let stringLiteral = extractStringFromStatement(statement) {
                    return stringLiteral
                }
            }
        }

        return nil
    }

    private func findStringLiteral(in expr: ExprSyntax) -> String? {
        if let stringLiteral = expr.as(StringLiteralExprSyntax.self) {
            return extractStringContent(from: stringLiteral)
        }

        // Check for LocalizedStringKey("...")
        if let funcCall = expr.as(FunctionCallExprSyntax.self),
           let identifier = funcCall.calledExpression.as(DeclReferenceExprSyntax.self),
           identifier.baseName.text == "LocalizedStringKey" || identifier.baseName.text == "Text",
           let firstArg = funcCall.arguments.first,
           let stringLiteral = firstArg.expression.as(StringLiteralExprSyntax.self) {
            return extractStringContent(from: stringLiteral)
        }

        return nil
    }

    private func extractStringContent(from literal: StringLiteralExprSyntax) -> String? {
        var result = ""
        for segment in literal.segments {
            if let stringSegment = segment.as(StringSegmentSyntax.self) {
                result += stringSegment.content.text
            }
        }
        return result.isEmpty ? nil : result
    }

    private func extractStringFromStatement(_ statement: CodeBlockItemSyntax) -> String? {
        // Look for Text("...") in closure body
        if let funcCall = statement.item.as(FunctionCallExprSyntax.self),
           let identifier = funcCall.calledExpression.as(DeclReferenceExprSyntax.self),
           identifier.baseName.text == "Text",
           let firstArg = funcCall.arguments.first,
           let stringLiteral = firstArg.expression.as(StringLiteralExprSyntax.self) {
            return extractStringContent(from: stringLiteral)
        }
        return nil
    }

    private func checkAccessibilityIdentifier(_ node: FunctionCallExprSyntax) -> (Bool, String?) {
        // Walk up the syntax tree to find .accessibilityIdentifier modifier
        var current: Syntax = Syntax(node)

        while let parent = current.parent {
            if let funcCall = parent.as(FunctionCallExprSyntax.self),
               let member = funcCall.calledExpression.as(MemberAccessExprSyntax.self),
               member.declName.baseName.text == "accessibilityIdentifier" {
                // Extract the identifier value
                if let firstArg = funcCall.arguments.first,
                   let stringLiteral = firstArg.expression.as(StringLiteralExprSyntax.self),
                   let value = extractStringContent(from: stringLiteral) {
                    return (true, value)
                }
                return (true, nil)
            }
            current = parent
        }

        return (false, nil)
    }

    private func generateAccessibilityId(viewName: String, componentType: String, label: String?) -> String {
        let key = "\(viewName)_\(componentType)"
        let count = componentCounter[key, default: 0]
        componentCounter[key] = count + 1

        let sanitizedLabel = label?
            .replacingOccurrences(of: " ", with: "_")
            .replacingOccurrences(of: "[^a-zA-Z0-9_]", with: "", options: .regularExpression)
            .prefix(20)

        if let labelPart = sanitizedLabel, !labelPart.isEmpty {
            return "\(viewName)_\(componentType)_\(labelPart)_\(count)"
        } else {
            return "\(viewName)_\(componentType)_\(count)"
        }
    }

    private func extractSourceLocation(from node: FunctionCallExprSyntax) -> SourceLocation {
        let startLocation = node.position
        let endLocation = node.endPosition

        let converter = SourceLocationConverter(fileName: "", tree: node.root)
        let start = converter.location(for: startLocation)
        let end = converter.location(for: endLocation)

        return SourceLocation(
            line: start.line,
            column: start.column,
            endLine: end.line,
            endColumn: end.column
        )
    }
}
