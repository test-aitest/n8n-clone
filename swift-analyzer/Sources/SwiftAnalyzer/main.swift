import ArgumentParser
import Foundation

/// Swift Analyzer CLI - Analyze SwiftUI source files for UI components
@main
struct SwiftAnalyzerCLI: ParsableCommand {
    static let configuration = CommandConfiguration(
        commandName: "swift-analyzer",
        abstract: "Analyze SwiftUI source files to detect UI components and inject accessibility identifiers",
        version: "1.0.0",
        subcommands: [Analyze.self, Inject.self],
        defaultSubcommand: Analyze.self
    )
}

// MARK: - Analyze Command

extension SwiftAnalyzerCLI {
    struct Analyze: ParsableCommand {
        static let configuration = CommandConfiguration(
            abstract: "Analyze a Swift file and detect SwiftUI components"
        )

        @Option(name: [.short, .long], help: "Input Swift file path")
        var input: String

        @Option(name: [.short, .long], help: "Output JSON file path (optional, prints to stdout if not specified)")
        var output: String?

        @Flag(name: .long, help: "Output summary instead of JSON")
        var summary: Bool = false

        func run() throws {
            // Read input file
            let inputURL = URL(fileURLWithPath: input)
            let source: String
            do {
                source = try String(contentsOf: inputURL, encoding: .utf8)
            } catch {
                throw ValidationError("Failed to read input file: \(input)")
            }

            // Analyze
            let analyzer = SwiftUIAnalyzer(source: source, filePath: input)
            let result = analyzer.analyze()

            // Output
            let formatter = OutputFormatter()

            if summary {
                let summaryOutput = AnalysisSummary(result: result)
                print(summaryOutput.description)
            } else {
                let json = try formatter.format(result)

                if let outputPath = output {
                    try formatter.write(json, to: outputPath)
                    print("Analysis result written to: \(outputPath)")
                } else {
                    print(json)
                }
            }
        }
    }
}

// MARK: - Inject Command

extension SwiftAnalyzerCLI {
    struct Inject: ParsableCommand {
        static let configuration = CommandConfiguration(
            abstract: "Inject accessibility identifiers into SwiftUI components"
        )

        @Option(name: [.short, .long], help: "Input Swift file path")
        var input: String

        @Option(name: [.short, .long], help: "Output Swift file path (optional, prints to stdout if not specified)")
        var output: String?

        @Flag(name: .long, help: "Output as JSON with metadata")
        var json: Bool = false

        @Flag(name: .long, help: "Show summary of changes")
        var summary: Bool = false

        func run() throws {
            // Read input file
            let inputURL = URL(fileURLWithPath: input)
            let source: String
            do {
                source = try String(contentsOf: inputURL, encoding: .utf8)
            } catch {
                throw ValidationError("Failed to read input file: \(input)")
            }

            // First analyze to get components
            let analyzer = SwiftUIAnalyzer(source: source, filePath: input)
            let analysisResult = analyzer.analyze()

            // Inject accessibility IDs
            let injector = AccessibilityIDInjector(
                source: source,
                filePath: input,
                components: analysisResult.components
            )
            let result = injector.inject()

            // Output
            let formatter = OutputFormatter()

            if summary {
                let summaryOutput = InjectionSummary(result: result)
                print(summaryOutput.description)
            } else if json {
                let jsonOutput = try formatter.format(result)
                print(jsonOutput)
            } else {
                if let outputPath = output {
                    try formatter.write(result.modifiedSource, to: outputPath)
                    print("Modified source written to: \(outputPath)")
                    print("Injected \(result.injectedCount) accessibility identifiers")
                } else {
                    print(result.modifiedSource)
                }
            }
        }
    }
}
