import { matchesParameterCount, parseMethodParameters, findMethodSignature } from '../utils';

describe('Parameter Matching', () => {
  describe('matchesParameterCount', () => {
    test('no parameters - only matches zero args', () => {
      expect(matchesParameterCount([], 0)).toBe(true);
      expect(matchesParameterCount([], 1)).toBe(false);
    });

    test('required parameters only', () => {
      expect(matchesParameterCount(['String msg'], 0)).toBe(false);
      expect(matchesParameterCount(['String msg'], 1)).toBe(true);
      expect(matchesParameterCount(['String msg'], 2)).toBe(false);
    });

    test('parameters with defaults', () => {
      expect(matchesParameterCount(['String msg = "default"'], 0)).toBe(true);
      expect(matchesParameterCount(['String msg = "default"'], 1)).toBe(true);
      expect(matchesParameterCount(['String msg = "default"'], 2)).toBe(false);
    });

    test('mixed required and optional parameters', () => {
      expect(matchesParameterCount(['String required', 'String optional = "default"'], 0)).toBe(false);
      expect(matchesParameterCount(['String required', 'String optional = "default"'], 1)).toBe(true);
      expect(matchesParameterCount(['String required', 'String optional = "default"'], 2)).toBe(true);
      expect(matchesParameterCount(['String required', 'String optional = "default"'], 3)).toBe(false);
    });
  });

  describe('parseMethodParameters', () => {
    test('single parameter', () => {
      expect(parseMethodParameters('String msg')).toEqual(['String msg']);
    });

    test('parameter with default', () => {
      expect(parseMethodParameters('String msg = "hello"')).toEqual(['String msg = "hello"']);
    });

    test('multiple parameters', () => {
      expect(parseMethodParameters('String msg, int count')).toEqual(['String msg', 'int count']);
    });

    test('empty parameters', () => {
      expect(parseMethodParameters('')).toEqual([]);
    });
  });
});

describe('Method Signature Finding (in Jenkins shared library global vars)', () => {
  const testGroovyCode = `
def call(String message = "Hello from shared library!") {
    echo message
}

def call(Map config) {
    echo "Calling with config: \${config}"
}

def deployTo(String environment) {
    echo "Deploying to \${environment}"
}
`;

  test('finds function with default parameter for zero args', () => {
    const result = findMethodSignature(testGroovyCode, 'call', []);
    expect(result).toBe('def call(String message = "Hello from shared library!")');
  });

  test('finds function with default parameter for one arg', () => {
    const result = findMethodSignature(testGroovyCode, 'call', ['arg']);
    expect(result).toBe('def call(String message = "Hello from shared library!")');
  });

  test('prefers Map function for map arguments', () => {
    const result = findMethodSignature(testGroovyCode, 'call', ['[key: value]']);
    expect(result).toBe('def call(Map config)');
  });

  test('finds specific function when only one matches', () => {
    const result = findMethodSignature(testGroovyCode, 'deployTo', ['env']);
    expect(result).toBe('def deployTo(String environment)');
  });

  test('returns null when no function matches', () => {
    const result = findMethodSignature(testGroovyCode, 'nonexistent', []);
    expect(result).toBeNull();
  });
});

describe('Method Signature Finding (in class context)', () => {
  const testClassCode = `
class TestClass {
    def method(String param) {
        return param;
    }

    def method(Map config) {
        return config;
    }

    static void staticMethod(String arg = "default") {
        println arg;
    }
}
`;

  test('finds method with matching parameters', () => {
    const result = findMethodSignature(testClassCode, 'method', ['param']);
    expect(result).toBe('def method(String param)');
  });

  test('prefers Map method for map arguments', () => {
    const result = findMethodSignature(testClassCode, 'method', ['[key: value]']);
    expect(result).toBe('def method(Map config)');
  });

  test('finds static method with default parameter', () => {
    const result = findMethodSignature(testClassCode, 'staticMethod', []);
    expect(result).toBe('static void staticMethod(String arg = "default")');
  });
});
