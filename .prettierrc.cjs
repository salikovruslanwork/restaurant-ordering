module.exports = {
  plugins: ['prettier-plugin-organize-attributes', '@ianvs/prettier-plugin-sort-imports'],
  trailingComma: 'none',
  tabWidth: 2,
  semi: true,
  singleQuote: true,
  bracketSpacing: true,
  printWidth: 100,

  overrides: [{ files: '*.component.html', options: { parser: 'angular' } }],

  attributeSort: 'ASC',
  attributeGroups: [
    '$ANGULAR_STRUCTURAL_DIRECTIVE',
    '$ANGULAR_ANIMATION',
    '$ANGULAR_ANIMATION_INPUT',
    '$ANGULAR_ELEMENT_REF',

    '$ID',
    '$CLASS',
    '^alt',
    '^label',
    '^placeholder',
    '^title',
    '^matTooltip',

    '$DEFAULT',

    '^\\[(?!\\(|@|attr\\.data-)',
    '$ANGULAR_TWO_WAY_BINDING',
    '$ANGULAR_OUTPUT',

    '^data-',
    '^\\[attr\\.data-'
  ],

  importOrderParserPlugins: ['typescript', 'classProperties', 'decorators-legacy'],
  importOrderTypeScriptVersion: '6.0.0',
  importOrder: [
    '^@angular/core(/.*)?$',
    '^@angular/common(/.*)?$',
    '^@angular/(.*)$',
    '',
    '^rxjs(/.*)?$',
    '<THIRD_PARTY_MODULES>',
    '',
    '^@ngrx/(.*)$',
    '',
    '^@restaurant/contracts$',
    '^@shared/(.*)$',
    '^@(admin|menu)/(.*)$',
    '',
    '^[./]'
  ]
};
