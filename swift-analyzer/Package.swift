// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "SwiftAnalyzer",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(name: "swift-analyzer", targets: ["SwiftAnalyzer"])
    ],
    dependencies: [
        .package(url: "https://github.com/apple/swift-syntax.git", from: "509.0.0"),
        .package(url: "https://github.com/apple/swift-argument-parser.git", from: "1.2.0")
    ],
    targets: [
        .executableTarget(
            name: "SwiftAnalyzer",
            dependencies: [
                .product(name: "SwiftSyntax", package: "swift-syntax"),
                .product(name: "SwiftParser", package: "swift-syntax"),
                .product(name: "SwiftSyntaxBuilder", package: "swift-syntax"),
                .product(name: "ArgumentParser", package: "swift-argument-parser")
            ],
            path: "Sources/SwiftAnalyzer",
            swiftSettings: [
                .unsafeFlags(["-parse-as-library"])
            ]
        ),
        .testTarget(
            name: "SwiftAnalyzerTests",
            dependencies: ["SwiftAnalyzer"],
            path: "Tests/SwiftAnalyzerTests"
        )
    ]
)
