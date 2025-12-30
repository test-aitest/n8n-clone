import Foundation

/// Represents a SwiftUI component detected in source code
public struct UIComponent: Codable, Equatable {
    /// Unique identifier for the component (format: ViewName_Type_Label_hash)
    public let id: String

    /// Type of SwiftUI component (Button, TextField, Toggle, etc.)
    public let type: String

    /// Label or title of the component (extracted from string literals)
    public let label: String?

    /// Whether the component already has an accessibilityIdentifier
    public let hasAccessibilityId: Bool

    /// Existing accessibility identifier if present
    public let existingAccessibilityId: String?

    /// Source file location
    public let sourceLocation: SourceLocation

    /// Parent view name (struct name containing this component)
    public let parentView: String

    /// Suggested accessibility ID to inject
    public let suggestedId: String

    public init(
        id: String,
        type: String,
        label: String?,
        hasAccessibilityId: Bool,
        existingAccessibilityId: String?,
        sourceLocation: SourceLocation,
        parentView: String,
        suggestedId: String
    ) {
        self.id = id
        self.type = type
        self.label = label
        self.hasAccessibilityId = hasAccessibilityId
        self.existingAccessibilityId = existingAccessibilityId
        self.sourceLocation = sourceLocation
        self.parentView = parentView
        self.suggestedId = suggestedId
    }
}

/// Source code location
public struct SourceLocation: Codable, Equatable {
    public let line: Int
    public let column: Int
    public let endLine: Int
    public let endColumn: Int

    public init(line: Int, column: Int, endLine: Int, endColumn: Int) {
        self.line = line
        self.column = column
        self.endLine = endLine
        self.endColumn = endColumn
    }
}

/// Analysis result containing all detected components
public struct AnalysisResult: Codable {
    /// Source file path
    public let filePath: String

    /// All detected UI components
    public let components: [UIComponent]

    /// Components that need accessibility IDs
    public let componentsNeedingIds: [UIComponent]

    /// Total component count
    public let totalCount: Int

    /// Count of components already having accessibility IDs
    public let withAccessibilityIdCount: Int

    /// Analysis timestamp
    public let timestamp: String

    public init(
        filePath: String,
        components: [UIComponent],
        componentsNeedingIds: [UIComponent],
        totalCount: Int,
        withAccessibilityIdCount: Int,
        timestamp: String
    ) {
        self.filePath = filePath
        self.components = components
        self.componentsNeedingIds = componentsNeedingIds
        self.totalCount = totalCount
        self.withAccessibilityIdCount = withAccessibilityIdCount
        self.timestamp = timestamp
    }
}

/// Injection result with modified source code
public struct InjectionResult: Codable {
    /// Original source file path
    public let originalFilePath: String

    /// Modified source code
    public let modifiedSource: String

    /// Number of IDs injected
    public let injectedCount: Int

    /// List of injected accessibility IDs
    public let injectedIds: [String]

    /// Timestamp
    public let timestamp: String

    public init(
        originalFilePath: String,
        modifiedSource: String,
        injectedCount: Int,
        injectedIds: [String],
        timestamp: String
    ) {
        self.originalFilePath = originalFilePath
        self.modifiedSource = modifiedSource
        self.injectedCount = injectedCount
        self.injectedIds = injectedIds
        self.timestamp = timestamp
    }
}

/// Supported SwiftUI component types for analysis
public enum SwiftUIComponentType: String, CaseIterable {
    case button = "Button"
    case textField = "TextField"
    case secureField = "SecureField"
    case toggle = "Toggle"
    case slider = "Slider"
    case picker = "Picker"
    case datePicker = "DatePicker"
    case stepper = "Stepper"
    case link = "Link"
    case navigationLink = "NavigationLink"
    case text = "Text"
    case label = "Label"
    case image = "Image"
    case list = "List"
    case scrollView = "ScrollView"
    case tabView = "TabView"
    case sheet = "Sheet"
    case alert = "Alert"

    /// Node type mapping for workflow nodes
    public var nodeType: String {
        switch self {
        case .button, .link, .navigationLink:
            return "IOS_TAP"
        case .textField, .secureField:
            return "IOS_TEXT_INPUT"
        case .toggle:
            return "IOS_TOGGLE_SWITCH"
        case .slider:
            return "IOS_SLIDER_SET"
        case .picker, .datePicker:
            return "IOS_PICKER_SELECT"
        case .scrollView, .list:
            return "IOS_SCROLL_UNTIL_VISIBLE"
        default:
            return "IOS_EXPECT_EXISTS"
        }
    }
}
