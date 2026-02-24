import { describe, it, expect } from '@jest/globals';
import { countBracesAndParens } from '../utils';

describe('countBracesAndParens', () => {
  describe('Basic counting', () => {
    it('should count balanced braces', () => {
      const result = countBracesAndParens('{ }');
      expect(result.openBraces).toBe(1);
      expect(result.closeBraces).toBe(1);
    });

    it('should count balanced parentheses', () => {
      const result = countBracesAndParens('( )');
      expect(result.openParens).toBe(1);
      expect(result.closeParens).toBe(1);
    });

    it('should count multiple braces', () => {
      const result = countBracesAndParens('{ { } }');
      expect(result.openBraces).toBe(2);
      expect(result.closeBraces).toBe(2);
    });

    it('should count multiple parentheses', () => {
      const result = countBracesAndParens('( ( ) )');
      expect(result.openParens).toBe(2);
      expect(result.closeParens).toBe(2);
    });

    it('should count unbalanced braces', () => {
      const result = countBracesAndParens('{ {');
      expect(result.openBraces).toBe(2);
      expect(result.closeBraces).toBe(0);
    });

    it('should count unbalanced parentheses', () => {
      const result = countBracesAndParens('( (');
      expect(result.openParens).toBe(2);
      expect(result.closeParens).toBe(0);
    });
  });

  describe('Strings', () => {
    it('should ignore braces in double quotes', () => {
      const result = countBracesAndParens('"{ }"');
      expect(result.openBraces).toBe(0);
      expect(result.closeBraces).toBe(0);
    });

    it('should ignore braces in single quotes', () => {
      const result = countBracesAndParens("'{ }'");
      expect(result.openBraces).toBe(0);
      expect(result.closeBraces).toBe(0);
    });

    it('should ignore parentheses in strings', () => {
      const result = countBracesAndParens('"( )"');
      expect(result.openParens).toBe(0);
      expect(result.closeParens).toBe(0);
    });

    it('should handle escaped quotes in strings', () => {
      const result = countBracesAndParens('"test\\"quote"');
      expect(result.openBraces).toBe(0);
      expect(result.closeBraces).toBe(0);
    });

    it('should count braces outside string with braces inside', () => {
      const result = countBracesAndParens('{ "{ }" }');
      expect(result.openBraces).toBe(1);
      expect(result.closeBraces).toBe(1);
    });
  });

  describe('Comments', () => {
    it('should ignore braces in line comments', () => {
      const result = countBracesAndParens('// { }');
      expect(result.openBraces).toBe(0);
      expect(result.closeBraces).toBe(0);
    });

    it('should ignore braces in multi-line comments', () => {
      const result = countBracesAndParens('/* { } */');
      expect(result.openBraces).toBe(0);
      expect(result.closeBraces).toBe(0);
    });

    it('should ignore parentheses in comments', () => {
      const result = countBracesAndParens('// ( )');
      expect(result.openParens).toBe(0);
      expect(result.closeParens).toBe(0);
    });

    it('should count braces outside comment', () => {
      const result = countBracesAndParens('{ // comment with } in it\n}');
      expect(result.openBraces).toBe(1);
      expect(result.closeBraces).toBe(1);
    });

    it('should handle multi-line comments with braces', () => {
      const result = countBracesAndParens(`{
        /* { } */
      }`);
      expect(result.openBraces).toBe(1);
      expect(result.closeBraces).toBe(1);
    });
  });

  describe('Regex literals', () => {
    it('should ignore braces in regex after equals', () => {
      const result = countBracesAndParens('path = /.*\\{.*\\}/');
      expect(result.openBraces).toBe(0);
      expect(result.closeBraces).toBe(0);
    });

    it('should ignore braces in regex after match operator', () => {
      const result = countBracesAndParens('if (path ==~ /.*\\{.*\\}/) {}');
      expect(result.openBraces).toBe(1);
      expect(result.closeBraces).toBe(1);
    });

    it('should ignore parentheses in regex', () => {
      const result = countBracesAndParens('if (x = /.*\\(.*\\)/) { }');
      expect(result.openBraces).toBe(1);
      expect(result.closeBraces).toBe(1);
    });

    it('should ignore escaped slashes in regex', () => {
      const result = countBracesAndParens('pattern = /\\/path\\/to\\/file/');
      expect(result.openBraces).toBe(0);
      expect(result.closeBraces).toBe(0);
    });

    it('should handle regex with split method', () => {
      const result = countBracesAndParens('tokens = text.split(/\\s+/).findAll { it }');
      expect(result.openBraces).toBe(1);
      expect(result.closeBraces).toBe(1);
    });

    it('issue example: validateRelativePaths regex', () => {
      // Simplified test focusing on regex with braces
      const code = `if (path.contains('$') && (path ==~ /.*\\$\\{[A-Za-z_][A-Za-z0-9_].*\\}/)) {
        throw new Exception("Contains env var")
      }`;
      const result = countBracesAndParens(code);
      // Check that regex braces don't get counted
      expect(result.openBraces).toBe(1);  // Only the if statement's opening brace
      expect(result.closeBraces).toBe(1);
      // Check that parentheses are balanced
      expect(result.openParens).toBe(result.closeParens);
    });
  });

  describe('Complex scenarios', () => {
    it('should handle mixed strings, comments, and code', () => {
      const code = `
        // This is a comment with { }
        String str = "string with { }";
        if (pattern ==~ /regex\\{\\}/) {
          method();
        }
      `;
      const result = countBracesAndParens(code);
      expect(result.openBraces).toBe(1);
      expect(result.closeBraces).toBe(1);
      expect(result.openParens).toBe(2);
      expect(result.closeParens).toBe(2);
    });

    it('should handle groovy closure', () => {
      const code = `list.each { item ->
    println item
}`;
      const result = countBracesAndParens(code);
      expect(result.openBraces).toBe(1);
      expect(result.closeBraces).toBe(1);
    });

    it('should handle nested structures', () => {
      const code = `if (condition) {
    list.each { item ->
        map[item] = value
    }
}`;
      const result = countBracesAndParens(code);
      expect(result.openBraces).toBe(2);
      expect(result.closeBraces).toBe(2);
      expect(result.openParens).toBe(1);  // Only 'if (condition)' has parentheses
      expect(result.closeParens).toBe(1);
    });

    it('should handle method calls with regex parameters', () => {
      const code = `validatePath(/^[a-z0-9{}_]+$/)`;
      const result = countBracesAndParens(code);
      expect(result.openBraces).toBe(0);
      expect(result.closeBraces).toBe(0);
      expect(result.openParens).toBe(1);
      expect(result.closeParens).toBe(1);
    });

    it('should handle empty structures', () => {
      const code = `{}`;
      const result = countBracesAndParens(code);
      expect(result.openBraces).toBe(1);
      expect(result.closeBraces).toBe(1);
    });

    it('should handle multiline regex', () => {
      const code = `if (path ==~ /.*\\{.*\\}/) {
    doSomething()
}`;
      const result = countBracesAndParens(code);
      expect(result.openBraces).toBe(1);
      expect(result.closeBraces).toBe(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      const result = countBracesAndParens('');
      expect(result.openBraces).toBe(0);
      expect(result.closeBraces).toBe(0);
      expect(result.openParens).toBe(0);
      expect(result.closeParens).toBe(0);
    });

    it('should handle only braces', () => {
      const result = countBracesAndParens('{');
      expect(result.openBraces).toBe(1);
      expect(result.closeBraces).toBe(0);
    });

    it('should handle string with quote', () => {
      const result = countBracesAndParens('\'\\"\'');
      expect(result.openBraces).toBe(0);
      expect(result.closeBraces).toBe(0);
    });

    it('should not treat division as regex', () => {
      const code = `int result = a / b;`;
      const result = countBracesAndParens(code);
      expect(result.openBraces).toBe(0);
      expect(result.closeBraces).toBe(0);
    });

    it('should treat regex after assignment operator', () => {
      const code = `pattern = /test/`;
      const result = countBracesAndParens(code);
      expect(result.openBraces).toBe(0);
      expect(result.closeBraces).toBe(0);
    });

    it('should handle consecutive regexes', () => {
      const code = `a = /{}/ + b = /{}/ `;
      const result = countBracesAndParens(code);
      expect(result.openBraces).toBe(0);
      expect(result.closeBraces).toBe(0);
    });
  });
});
