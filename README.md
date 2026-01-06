# Groovy Language Server and VSCode Extension

A Visual Studio Code extension that provides Language Server Protocol (LSP) support for Groovy, enabling rich language features like syntax highlighting, code completion, diagnostics, and more.

## Features

- **Syntax Highlighting**: Full TextMate grammar support for Groovy syntax
- **Code Completion**: Intelligent keyword and context-aware suggestions
- **Go to Definition**: Jump to the definition of classes, methods, properties, and variables
- **Document Symbols**: Navigate classes, methods, and properties with the outline view
- **Diagnostics**: Real-time syntax validation and error detection
- **Hover Information**: Display documentation for keywords and symbols
- **Language Configuration**: Auto-closing brackets, comment toggling, and proper indentation

## Supported File Extensions

- `.groovy` - Standard Groovy files
- `.gvy` - Groovy script files
- `.gy` - Groovy files
- `.gsh` - Groovy shell scripts

## Installation

### From Source

1. Clone or navigate to this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile the extension:
   ```bash
   npm run compile
   ```

4. Open VSCode and press `F5` to launch the Extension Development Host

### Package as VSIX

To package the extension for distribution:

```bash
npm install -g @vscode/vsce
vsce package
```

This creates a `.vsix` file that can be installed in VSCode via:
- Extensions panel → `...` menu → Install from VSIX

## Development

### Project Structure

```
groovy-vscode-extension/
├── client/                     # VSCode extension client
│   ├── src/
│   │   └── extension.ts       # Extension entry point
│   ├── syntaxes/
│   │   └── groovy.tmLanguage.json  # TextMate grammar
│   └── package.json
├── server/                     # Language server
│   ├── src/
│   │   └── server.ts          # LSP implementation
│   └── package.json
├── .vscode/
│   └── launch.json            # Debug configuration
└── package.json               # Root package
└── language-configuration.json               # Root package
```

### Building

```bash
# Compile both client and server
npm run ci

# Watch mode (auto-compile on changes)
npm run watch
```

### Debugging

1. Open the project in VSCode
2. Press `F5` or select "Launch Client" from the debug panel
3. A new VSCode window (Extension Development Host) will open
4. Open or create a `.groovy` file to test the extension

To debug both client and server:
- Select "Client + Server" compound configuration
- Set breakpoints in either `client/src/extension.ts` or `server/src/server.ts`

## Future Enhancements

- Find References
- Rename refactoring
- Semantic tokens

### Testing the Extension

Before publishing, test the packaged extension:

1. Install the `.vsix` file locally in VS Code:
   - Open VS Code
   - Extensions panel → `...` menu → Install from VSIX
   - Select the generated `.vsix` file

2. Test all features with `.groovy` files

## Requirements

- Node.js 18.0 or higher
- VSCode 1.85.0 or higher

## License

MIT

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests

## Changelog

### 1.0.0 (Initial Release)

- Syntax highlighting via TextMate grammar
- Go to Definition for classes, methods, properties, and variables
- Document symbols (outline view)
- Hover information for keywords
- Basic syntax diagnostics
- Language configuration (brackets, comments, auto-closing)
