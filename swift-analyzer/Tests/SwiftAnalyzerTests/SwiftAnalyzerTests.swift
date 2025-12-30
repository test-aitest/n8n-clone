import XCTest
@testable import SwiftAnalyzer

final class SwiftAnalyzerTests: XCTestCase {
    func testBasicAnalysis() throws {
        let source = """
        import SwiftUI

        struct LoginView: View {
            @State private var username = ""
            @State private var password = ""

            var body: some View {
                VStack {
                    TextField("Username", text: $username)
                    SecureField("Password", text: $password)
                    Button("Login") {
                        performLogin()
                    }
                }
            }

            func performLogin() {}
        }
        """

        let analyzer = SwiftUIAnalyzer(source: source, filePath: "LoginView.swift")
        let result = analyzer.analyze()

        XCTAssertEqual(result.totalCount, 3)
        XCTAssertTrue(result.components.contains { $0.type == "TextField" })
        XCTAssertTrue(result.components.contains { $0.type == "SecureField" })
        XCTAssertTrue(result.components.contains { $0.type == "Button" })
    }

    func testAccessibilityIdDetection() throws {
        let source = """
        import SwiftUI

        struct TestView: View {
            var body: some View {
                Button("With ID") {}
                    .accessibilityIdentifier("existing_id")
                Button("Without ID") {}
            }
        }
        """

        let analyzer = SwiftUIAnalyzer(source: source, filePath: "TestView.swift")
        let result = analyzer.analyze()

        let withId = result.components.first { $0.label == "With ID" }
        let withoutId = result.components.first { $0.label == "Without ID" }

        XCTAssertNotNil(withId)
        XCTAssertNotNil(withoutId)
        XCTAssertTrue(withId?.hasAccessibilityId ?? false)
        XCTAssertFalse(withoutId?.hasAccessibilityId ?? true)
    }

    func testInjection() throws {
        let source = """
        import SwiftUI

        struct TestView: View {
            var body: some View {
                Button("Test") {}
            }
        }
        """

        let analyzer = SwiftUIAnalyzer(source: source, filePath: "TestView.swift")
        let analysisResult = analyzer.analyze()

        let injector = AccessibilityIDInjector(
            source: source,
            filePath: "TestView.swift",
            components: analysisResult.components
        )
        let result = injector.inject()

        XCTAssertEqual(result.injectedCount, 1)
        XCTAssertTrue(result.modifiedSource.contains(".accessibilityIdentifier"))
    }
}
