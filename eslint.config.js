import js from '@eslint/js';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                // Browser globals
                window: 'readonly',
                document: 'readonly',
                navigator: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                alert: 'readonly',
                localStorage: 'readonly',
                Image: 'readonly',
                // EmailJS global
                emailjs: 'readonly'
            }
        },
        rules: {
            // Indentation - 4 spaces
            'indent': ['error', 4, {
                'SwitchCase': 1,
                'ignoredNodes': ['ConditionalExpression']
            }],

            // Quotes - prefer single quotes
            'quotes': ['error', 'single', {
                'avoidEscape': true,
                'allowTemplateLiterals': true
            }],

            // Semicolons - require them
            'semi': ['error', 'always'],

            // No unused variables (warning only)
            'no-unused-vars': ['warn', {
                'argsIgnorePattern': '^_',
                'varsIgnorePattern': '^_'
            }],

            // Consistent spacing
            'space-before-blocks': 'error',
            'keyword-spacing': 'error',
            'comma-spacing': 'error',
            'object-curly-spacing': ['error', 'always'],
            'array-bracket-spacing': ['error', 'never'],

            // Best practices
            'no-var': 'error',
            'prefer-const': 'warn',
            'eqeqeq': ['error', 'always', { 'null': 'ignore' }],
            'no-console': 'off', // Allow console for debugging

            // Prevent common errors
            'no-undef': 'error',
            'no-dupe-keys': 'error',
            'no-duplicate-case': 'error',
            'no-unreachable': 'error'
        }
    },
    {
        // Ignore patterns
        ignores: [
            'node_modules/**',
            'dist/**',
            '*.config.js'
        ]
    }
];
