// Enforces docs/design-system.md §7 (colors C1–C3, styles S1–S7).
export default {
  extends: ['stylelint-config-standard', 'stylelint-config-recommended-vue'],
  rules: {
    // C1–C3: colors only through theme variables
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': ['hsl', 'hsla'],
    'declaration-property-value-disallowed-list': {
      // Vuetify's --v-theme-* are "r,g,b"; rgb(var(--v-theme-x) / a) mixes comma and slash
      // syntax, is invalid, and silently paints nothing. Use color-mix(… transparent) for alpha.
      '/.*/': ['/rgba?\\(\\s*\\d/', '/rgba?\\(var\\(--v-theme-[a-z0-9-]+\\)\\s*\\//'],
      'z-index': ['/^-?\\d+$/'],
    },
    // S1: raw px only for border/outline widths and responsive breakpoints
    'unit-disallowed-list': [
      ['px'],
      {
        ignoreProperties: { px: ['/^border/', '/^outline/', 'box-shadow'] },
        ignoreMediaFeatureNames: { px: ['width', 'min-width', 'max-width'] },
      },
    ],
    // S2 / S4
    // stylelint checks both declarations and var() usages; --v-* are Vuetify's theme variables (rule C2)
    'custom-property-pattern': ['^(mtg|v|depth)-[a-z0-9-]+$', { message: 'Custom properties use the --mtg- prefix (S2)' }],
    'selector-class-pattern': [
      '^[a-z][a-z0-9-]*(__[a-z0-9-]+)?(--[a-z0-9-]+)?$',
      { message: 'Class names are kebab-case; BEM segments only for Vuetify overrides (S4)' },
    ],
    'declaration-no-important': true,
    'selector-max-id': 0,
  },
  overrides: [
    {
      files: ['src/styles/tokens.css'],
      rules: { 'unit-disallowed-list': null },
    },
  ],
}
