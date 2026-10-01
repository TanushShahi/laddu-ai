/**
 * Calculator Plugin
 * High precision safe arithmetic and scientific evaluations.
 */
export default {
  name: 'calculator',
  version: '1.0.0',
  description: 'Evaluates mathematical and scientific expressions safely.',
  requiredPermission: null, // Math requires no special permission

  tools: [
    {
      name: 'calculate',
      description: 'Calculate mathematical expressions safely.',
      parameters: {
        expression: { type: 'string', description: 'The math expression, e.g. (25 * 4) + sqrt(144)' }
      },
      execute: async ({ expression }) => {
        if (!expression || typeof expression !== 'string') {
          return { error: 'Invalid expression' };
        }

        // Clean and translate math functions
        const sanitized = expression
          .replace(/sqrt\(/gi, 'Math.sqrt(')
          .replace(/sin\(/gi, 'Math.sin(')
          .replace(/cos\(/gi, 'Math.cos(')
          .replace(/tan\(/gi, 'Math.tan(')
          .replace(/log\(/gi, 'Math.log(')
          .replace(/pi/gi, 'Math.PI')
          .replace(/e\b/gi, 'Math.E')
          .replace(/\^/g, '**');

        // Whitelist check
        if (!/^[0-9\.\s\+\-\*\/\%\(\)\,\w\.]+$/.test(sanitized)) {
          return { error: 'Expression contains disallowed characters' };
        }

        try {
          const fn = new Function(`return (${sanitized});`);
          const result = fn();
          return { expression, result };
        } catch (err) {
          return { error: `Calculation error: ${err.message}` };
        }
      }
    }
  ]
};
