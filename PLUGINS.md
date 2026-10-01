# J.A.R.V.I.S. — Extensible Plugin Architecture

JARVIS includes a pluggable tool system. You can create a new plugin in `plugins/<plugin-name>/index.js` without modifying the core AI brain.

## Plugin Structure

```javascript
/**
 * Example Plugin: Currency Converter
 */
export default {
  name: 'currency',
  version: '1.0.0',
  description: 'Converts between fiat and crypto currencies.',
  requiredPermission: 'network.research', // Optional permission key

  tools: [
    {
      name: 'convert_currency',
      description: 'Convert an amount from one currency to another.',
      parameters: {
        amount: { type: 'number', description: 'Amount to convert' },
        from: { type: 'string', description: 'Source currency (e.g. USD, EUR, INR)' },
        to: { type: 'string', description: 'Target currency' }
      },
      execute: async ({ amount, from, to }) => {
        // Implementation
        return { amount, from, to, convertedAmount: amount * 1.08 };
      }
    }
  ]
};
```

## Plugin Discovery
The `ToolRegistry` scans the `plugins/` directory at startup and registers all tools with input parameter validation and permission checks.
