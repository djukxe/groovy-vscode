# Quick Start Guide

## Testing the Extension

1. **Open the project in VSCode:**
   ```bash
   cd groovy-vscode-extension
   code .
   ```

2. **Press F5** to launch the Extension Development Host
   - This will open a new VSCode window with your extension loaded

3. **In the new window, open the example file:**
   - Open `example.groovy` or create a new `.groovy` file

4. **Try the features:**
   - **Syntax Highlighting**: Notice keywords, strings, and comments are highlighted
   - **Autocomplete**: Type `def`, `class`, or other keywords and see suggestions
   - **Go to Definition**: `Cmd+Click` (Mac) or `Ctrl+Click` (Windows/Linux) on any class, method, or variable name to jump to its definition. Or right-click and select "Go to Definition"
   - **Document Symbols**: Press `Cmd+Shift+O` (Mac) or `Ctrl+Shift+O` (Windows/Linux) to see the outline
   - **Hover**: Hover over keywords like `def`, `class`, `return` to see documentation
   - **Diagnostics**: Remove a closing brace to see error diagnostics

## What's Working

✅ **Syntax Highlighting**
- Keywords: `class`, `def`, `if`, `for`, `while`, etc.
- Strings with interpolation: `"Hello ${name}"`
- Comments: `//` and `/* */`
- Annotations: `@Override`, `@Deprecated`
- Operators and constants

✅ **Code Completion**
- All Groovy keywords with descriptions
- Triggered automatically as you type

✅ **Go to Definition**
- Classes, interfaces, enums, traits
- Methods and constructors
- Properties and fields
- Local variables and parameters
- Use Cmd+Click / Ctrl+Click or F12

✅ **Document Symbols (Outline)**
- Classes
- Methods
- Properties/Fields
- Access via Cmd+Shift+O or the Outline panel

✅ **Hover Information**
- Keyword descriptions
- Symbol information

✅ **Diagnostics**
- Unmatched braces detection
- Unmatched parentheses detection

✅ **Language Configuration**
- Auto-closing brackets: `{}`, `[]`, `()`
- Auto-closing quotes: `""`, `''`
- Comment toggling: `Cmd+/` or `Ctrl+/`
- Proper indentation

## Debugging the Extension

To debug the extension itself:

1. Set breakpoints in `client/src/extension.ts` or `server/src/server.ts`
2. Select "Client + Server" from the debug dropdown
3. Press F5
4. The debugger will attach to both client and server

## Next Steps

- Modify `server/src/server.ts` to add more LSP features
- Update `client/syntaxes/groovy.tmLanguage.json` to improve syntax highlighting
- Add more patterns to `language-configuration.json`
- Test with your own Groovy projects

## Packaging for Distribution

When ready to share:

```bash
npm install -g @vscode/vsce
vsce package
```

This creates a `.vsix` file that can be installed in any VSCode instance.
