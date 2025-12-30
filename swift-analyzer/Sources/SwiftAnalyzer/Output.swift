import Foundation

/// JSON output formatter for analysis results
public struct OutputFormatter {
    private let encoder: JSONEncoder

    public init(prettyPrinted: Bool = true) {
        encoder = JSONEncoder()
        if prettyPrinted {
            encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        }
    }

    /// Format analysis result as JSON string
    public func format(_ result: AnalysisResult) throws -> String {
        let data = try encoder.encode(result)
        guard let json = String(data: data, encoding: .utf8) else {
            throw OutputError.encodingFailed
        }
        return json
    }

    /// Format injection result as JSON string
    public func format(_ result: InjectionResult) throws -> String {
        let data = try encoder.encode(result)
        guard let json = String(data: data, encoding: .utf8) else {
            throw OutputError.encodingFailed
        }
        return json
    }

    /// Write result to file
    public func write(_ content: String, to path: String) throws {
        let url = URL(fileURLWithPath: path)
        try content.write(to: url, atomically: true, encoding: .utf8)
    }
}

public enum OutputError: Error, LocalizedError {
    case encodingFailed
    case writeFailed(String)

    public var errorDescription: String? {
        switch self {
        case .encodingFailed:
            return "Failed to encode result to JSON"
        case .writeFailed(let path):
            return "Failed to write to file: \(path)"
        }
    }
}

/// Summary output for CLI display
public struct AnalysisSummary {
    public let result: AnalysisResult

    public init(result: AnalysisResult) {
        self.result = result
    }

    public var description: String {
        var lines: [String] = []
        lines.append("=== SwiftUI Component Analysis ===")
        lines.append("File: \(result.filePath)")
        lines.append("Total components found: \(result.totalCount)")
        lines.append("Components with accessibility IDs: \(result.withAccessibilityIdCount)")
        lines.append("Components needing IDs: \(result.componentsNeedingIds.count)")
        lines.append("")

        if !result.componentsNeedingIds.isEmpty {
            lines.append("Components needing accessibility IDs:")
            for component in result.componentsNeedingIds {
                let label = component.label ?? "(no label)"
                lines.append("  - \(component.type) \"\(label)\" at line \(component.sourceLocation.line)")
                lines.append("    Suggested ID: \(component.suggestedId)")
            }
        }

        return lines.joined(separator: "\n")
    }
}

/// Summary for injection result
public struct InjectionSummary {
    public let result: InjectionResult

    public init(result: InjectionResult) {
        self.result = result
    }

    public var description: String {
        var lines: [String] = []
        lines.append("=== Accessibility ID Injection ===")
        lines.append("Original file: \(result.originalFilePath)")
        lines.append("IDs injected: \(result.injectedCount)")

        if !result.injectedIds.isEmpty {
            lines.append("")
            lines.append("Injected IDs:")
            for id in result.injectedIds {
                lines.append("  - \(id)")
            }
        }

        return lines.joined(separator: "\n")
    }
}
