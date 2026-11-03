import angular from 'angular-eslint';
import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

const MATERIAL_ONLY_IN_UI = {
  regex: '^@angular/material(/|$)',
  message: 'Only @shared/ui may import @angular/material. Use or extend its wrappers.'
};
const ADMIN_APP = {
  regex: '^@admin(/|$)|(^|/)admin/src(/|$)',
  message: 'Apps never import from each other.'
};
const MENU_APP = {
  regex: '^@menu(/|$)|(^|/)menu/src(/|$)',
  message: 'Apps never import from each other.'
};
const APPS_FROM_SHARED = {
  regex: '^@(admin|menu)(/|$)|(^|/)(admin|menu)/src(/|$)',
  message: 'The shared library must not import from apps.'
};

const ON_PUSH = {
  selector:
    "Decorator[expression.callee.name='Component'] > CallExpression > ObjectExpression:not(:has(> Property[key.name='changeDetection']))",
  message: 'Declare changeDetection: ChangeDetectionStrategy.OnPush.'
};
const TYPES_IN_MODELS = {
  selector:
    'Program > :matches(TSInterfaceDeclaration, TSTypeAliasDeclaration, TSEnumDeclaration), Program > ExportNamedDeclaration > :matches(TSInterfaceDeclaration, TSTypeAliasDeclaration, TSEnumDeclaration)',
  message: 'Declare interfaces, types and enums in a models/*.model.ts file.'
};

const restrictImports = (...patterns) => ({
  rules: { 'no-restricted-imports': ['error', { patterns }] }
});

export default defineConfig(
  { ignores: ['**/dist/', '**/coverage/', '**/.angular/'] },
  tseslint.configs.recommended,
  {
    files: ['contracts/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { regex: '^(?!\\./)', message: 'contracts may only import from its own files.' }
          ]
        }
      ],
      'no-restricted-syntax': [
        'error',
        { selector: 'ImportExpression', message: 'contracts must not use dynamic imports.' },
        { selector: 'TSImportEqualsDeclaration', message: 'contracts must not use import =.' },
        { selector: 'TSImportType', message: 'contracts must not use import() types.' }
      ]
    }
  },
  {
    files: ['web/projects/**/*.ts'],
    extends: [angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/component-class-suffix': 'error',
      '@angular-eslint/component-max-inline-declarations': ['error', { template: 0, styles: 0 }],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' }
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' }
      ],
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      'no-restricted-syntax': ['error', ON_PUSH]
    }
  },
  {
    files: ['web/projects/**/*.ts'],
    ignores: ['**/*.model.ts', '**/*.spec.ts', '**/testing/**'],
    rules: { 'no-restricted-syntax': ['error', ON_PUSH, TYPES_IN_MODELS] }
  },
  {
    files: ['web/projects/**/*.spec.ts'],
    rules: { '@angular-eslint/component-max-inline-declarations': 'off' }
  },
  {
    files: ['web/projects/**/*.component.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility]
  },
  {
    files: ['web/projects/admin/**/*.ts'],
    ...restrictImports(MATERIAL_ONLY_IN_UI, MENU_APP)
  },
  {
    files: ['web/projects/menu/**/*.ts'],
    ...restrictImports(MATERIAL_ONLY_IN_UI, ADMIN_APP)
  },
  {
    files: ['web/projects/shared/**/*.ts'],
    ...restrictImports(MATERIAL_ONLY_IN_UI, APPS_FROM_SHARED)
  },
  {
    files: ['web/projects/shared/ui/**/*.ts'],
    ...restrictImports(APPS_FROM_SHARED)
  },
  prettier
);
