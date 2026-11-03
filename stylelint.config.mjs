export default {
  extends: ['stylelint-config-standard-scss'],
  plugins: ['stylelint-selector-bem-pattern'],
  rules: {
    'max-nesting-depth': 3,
    'selector-max-id': 0,
    'selector-class-pattern': [
      '^[a-z][a-z0-9-]*(__[a-z0-9-]+)?(--[a-z0-9-]+)?$',
      { message: 'Use BEM: block__element--modifier, with no element inside another element.' }
    ],
    'plugin/selector-bem-pattern': {
      preset: 'bem',
      implicitComponents: '**/*.component.scss',
      ignoreSelectors: ['^:host']
    }
  }
};
