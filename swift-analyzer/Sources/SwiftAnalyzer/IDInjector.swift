import Foundation
import SwiftSyntax
import SwiftParser
import SwiftSyntaxBuilder

/// Injects accessibility identifiers into SwiftUI components
public final class AccessibilityIDInjector {
    private let source: String
    private let filePath: String
    private let components: [UIComponent]

    public init(source: String, filePath: String, components: [UIComponent]) {
        self.source = source
        self.filePath = filePath
        self.components = components
    }

    /// Inject accessibility identifiers and return modified source
    public func inject() -> InjectionResult {
        let sourceFile = Parser.parse(source: source)
        let rewriter = AccessibilityIDRewriter(components: components)
        let modifiedSyntax = rewriter.visit(sourceFile)

        return InjectionResult(
            originalFilePath: filePath,
            modifiedSource: modifiedSyntax.description,
            injectedCount: rewriter.injectedIds.count,
            injectedIds: rewriter.injectedIds,
            timestamp: ISO8601DateFormatter().string(from: Date())
        )
    }
}

/// SyntaxRewriter to inject accessibilityIdentifier modifiers
final class AccessibilityIDRewriter: SyntaxRewriter {
    private let componentsToInject: [UIComponent]
    private var currentViewName: String = "Unknown"
    private var componentCounter: [String: Int] = [:]
    var injectedIds: [String] = []

    init(components: [UIComponent]) {
        // Only inject IDs for components that don't have them
        self.componentsToInject = components.filter { !$0.hasAccessibilityId }
        super.init()
    }

    override func visit(_ node: StructDeclSyntax) -> DeclSyntax {
        currentViewName = node.name.text
        let result = super.visit(node)
        currentViewName = "Unknown"
        return result
    }

    override func visit(_ node: FunctionCallExprSyntax) -> ExprSyntax {
        // First visit children recursively
        let visitedNode = super.visit(node)

        guard let funcCall = visitedNode.as(FunctionCallExprSyntax.self) else {
            return visitedNode
        }

        // Check if this is a SwiftUI component that needs an ID
        guard let componentType = extractComponentType(from: funcCall),
              shouldInjectAccessibilityId(componentType: componentType, node: funcCall) else {
            return ExprSyntax(funcCall)
        }

        // Generate accessibility ID
        let accessibilityId = generateAccessibilityId(
            viewName: currentViewName,
            componentType: componentType,
            label: extractLabel(from: funcCall)
        )

        // Create the .accessibilityIdentifier("id") modifier call
        let modifiedExpr = addAccessibilityIdentifier(to: funcCall, id: accessibilityId)
        injectedIds.append(accessibilityId)

        return modifiedExpr
    }

    // MARK: - Private Helpers

    private func extractComponentType(from node: FunctionCallExprSyntax) -> String? {
        let calleeName: String

        if let identifier = node.calledExpression.as(DeclReferenceExprSyntax.self) {
            calleeName = identifier.baseName.text
        } else if let member = node.calledExpression.as(MemberAccessExprSyntax.self) {
            calleeName = member.declName.baseName.text
        } else {
            return nil
        }

        guard SwiftUIComponentType.allCases.contains(where: { $0.rawValue == calleeName }) else {
            return nil
        }

        return calleeName
    }

    private func shouldInjectAccessibilityId(componentType: String, node: FunctionCallExprSyntax) -> Bool {
        // Check if this node already has an accessibilityIdentifier in the chain
        // We need to check the parent to see if it's already wrapped
        var current: Syntax = Syntax(node)

        while let parent = current.parent {
            if let funcCall = parent.as(FunctionCallExprSyntax.self),
               let member = funcCall.calledExpression.as(MemberAccessExprSyntax.self),
               member.declName.baseName.text == "accessibilityIdentifier" {
                return false
            }
            current = parent
        }

        return true
    }

    private func extractLabel(from node: FunctionCallExprSyntax) -> String? {
        for argument in node.arguments {
            if let stringLiteral = argument.expression.as(StringLiteralExprSyntax.self) {
                return extractStringContent(from: stringLiteral)
            }
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

    private func addAccessibilityIdentifier(to node: FunctionCallExprSyntax, id: String) -> ExprSyntax {
        // Create: originalExpr.accessibilityIdentifier("id")

        // Build the member access expression
        let memberAccess = MemberAccessExprSyntax(
            base: ExprSyntax(node),
            period: .periodToken(),
            declName: DeclReferenceExprSyntax(baseName: .identifier("accessibilityIdentifier"))
        )

        // Build the string literal argument
        let stringLiteral = StringLiteralExprSyntax(
            openingQuote: .stringQuoteToken(),
            segments: StringLiteralSegmentListSyntax([
                .stringSegment(StringSegmentSyntax(content: .stringSegment(id)))
            ]),
            closingQuote: .stringQuoteToken()
        )

        // Build the function call
        let labeledExpr = LabeledExprSyntax(expression: ExprSyntax(stringLiteral))
        let arguments = LabeledExprListSyntax([labeledExpr])

        let funcCall = FunctionCallExprSyntax(
            calledExpression: ExprSyntax(memberAccess),
            leftParen: .leftParenToken(),
            arguments: arguments,
            rightParen: .rightParenToken()
        )

        return ExprSyntax(funcCall)
    }
}
