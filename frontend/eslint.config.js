import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Vuetify tags that feature code must reach through components/base/* (plan §9.2).
const WRAPPED_VUETIFY_TAGS = [
  ['v-btn', 'BaseButton / BaseIconButton'],
  ['v-card', 'BaseCard'],
  ['v-chip', 'BaseChip'],
  ['v-badge', 'BaseBadge'],
  ['v-tooltip', 'BaseTooltip'],
  ['v-dialog', 'BaseDialog'],
  ['v-menu', 'BaseMenu'],
  ['v-text-field', 'BaseTextField'],
  ['v-select', 'BaseSelect'],
  ['v-switch', 'BaseSwitch'],
  ['v-tabs', 'BaseTabs'],
  ['v-tab', 'BaseTabs'],
].map(([element, replacement]) => ({ element, message: `Use ${replacement} from components/base instead.` }))

const HEX_COLOR = '/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b/'
const HEX_MESSAGE = 'Hex colors live only in src/constants/themeColors.ts (design-system rule C1).'

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'playwright-report/**', 'test-results/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.vue'], sourceType: 'module' },
    },
  },
  {
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      'vue/block-order': ['error', { order: ['template', 'script', 'style'] }],
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/define-macros-order': ['error', { order: ['defineProps', 'defineEmits', 'defineModel', 'defineSlots'] }],
      'vue/multi-word-component-names': 'error',
      'vue/no-v-html': 'error',
      'vue/no-unused-refs': 'error',
      'vue/no-useless-v-bind': 'error',
      'vue/prefer-true-attribute-shorthand': 'error',
      'vue/require-explicit-emits': 'error',
      'vue/no-required-prop-with-default': 'error',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': ['error', { html: { void: 'always', normal: 'never', component: 'always' } }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'error',
      'no-restricted-syntax': [
        'error',
        { selector: `Literal[value=${HEX_COLOR}]`, message: HEX_MESSAGE },
        { selector: `TemplateElement[value.raw=${HEX_COLOR}]`, message: HEX_MESSAGE },
      ],
    },
  },
  {
    files: ['src/components/features/**/*.vue', 'src/components/common/**/*.vue', 'src/pages/**/*.vue', 'src/layouts/**/*.vue'],
    rules: {
      'vue/no-restricted-html-elements': ['error', ...WRAPPED_VUETIFY_TAGS],
    },
  },
  {
    files: ['src/constants/themeColors.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['src/workers/**/*.ts'],
    languageOptions: { globals: { ...globals.worker } },
  },
  {
    files: ['tests/**/*.ts', '*.config.{js,ts}'],
    languageOptions: { globals: { ...globals.node } },
  },
)
