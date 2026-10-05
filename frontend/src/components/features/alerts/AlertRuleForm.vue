<template>
  <form class="alert-rule-form" novalidate @submit.prevent="submit">
    <BaseTextField v-model="symbol" :label="t('alert.form.symbol')" :error-message="shownSymbolError" class="alert-rule-form__symbol" />
    <BaseSelect v-model="condition" :items="conditionOptions" :label="t('alert.form.condition')" class="alert-rule-form__condition" />
    <BaseTextField
      v-if="unit !== null"
      v-model="thresholdText"
      :label="t('alert.form.threshold')"
      :suffix="t(unitKey)"
      :error-message="shownThresholdError"
      class="alert-rule-form__threshold"
    />
    <BaseButton type="submit" prepend-icon="add" class="alert-rule-form__submit">{{ t('alert.form.add') }}</BaseButton>
  </form>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseSelect from '@/components/base/BaseSelect.vue'
import BaseTextField from '@/components/base/BaseTextField.vue'
import { useFormatContext } from '@/composables/useFormatContext'
import { ALERT_CONDITIONS } from '@/constants/alerts'
import type { AlertCondition, AlertRuleDraft } from '@/interfaces/alert'
import type { InstrumentType } from '@/interfaces/market'
import type { SelectOption } from '@/interfaces/ui'
import { parseAlertThreshold, thresholdUnitKey } from '@/utils/alertFormat'

/** New alert rule (FR-32). The threshold is typed in the board's display unit and stored raw. */
const { initialSymbol = '', resolveType } = defineProps<{
  initialSymbol?: string
  /** Instrument type of a symbol, or null when the symbol is unknown. */
  resolveType: (symbol: string) => InstrumentType | null
}>()

const emit = defineEmits<{
  submit: [draft: AlertRuleDraft]
}>()

const { t } = useI18n()
const formatContext = useFormatContext()

const symbol = ref<string | null>(initialSymbol)
const condition = ref<AlertCondition>('PRICE_ABOVE')
const thresholdText = ref<string | null>('')
const isSubmitted = ref(false)

const normalizedSymbol = computed(() => (symbol.value ?? '').trim().toUpperCase())
const type = computed(() => resolveType(normalizedSymbol.value))
const unit = computed(() => ALERT_CONDITIONS.find((item) => item.condition === condition.value)?.thresholdUnit ?? null)
const unitKey = computed(() => (unit.value ? thresholdUnitKey(unit.value, type.value ?? 'STOCK', formatContext.value) : ''))
const threshold = computed(() =>
  unit.value ? parseAlertThreshold(thresholdText.value ?? '', unit.value, type.value ?? 'STOCK', formatContext.value) : null,
)

const conditionOptions = computed<SelectOption<AlertCondition>[]>(() =>
  ALERT_CONDITIONS.map((item) => ({ value: item.condition, title: t(item.labelKey) })),
)

const symbolError = computed(() => (type.value === null ? t('alert.form.unknownSymbol') : ''))
const thresholdError = computed(() => (unit.value !== null && threshold.value === null ? t('alert.form.invalidThreshold') : ''))
// Errors appear only after the first submit, not while the user is still typing.
const shownSymbolError = computed(() => (isSubmitted.value ? symbolError.value : ''))
const shownThresholdError = computed(() => (isSubmitted.value ? thresholdError.value : ''))

function submit(): void {
  isSubmitted.value = true
  if (symbolError.value || thresholdError.value) return
  emit('submit', { symbol: normalizedSymbol.value, condition: condition.value, threshold: threshold.value })
  thresholdText.value = ''
  isSubmitted.value = false
}

watch(
  () => initialSymbol,
  (next) => {
    symbol.value = next
  },
)
</script>

<style scoped>
.alert-rule-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(calc(var(--mtg-panel-min-width) / 2), 1fr));
  align-items: start;
  gap: var(--mtg-space-2);
}

.alert-rule-form__submit {
  align-self: center;
}
</style>
