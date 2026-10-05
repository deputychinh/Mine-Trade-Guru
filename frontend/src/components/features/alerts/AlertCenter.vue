<template>
  <BaseDialog v-model="isOpen" :title="t('alert.center')" :close-label="t('common.close')" :max-width="680">
    <BaseTabs v-model="tab" :items="tabs" :label="t('alert.center')" />
    <section v-if="tab === 'rules'" class="alert-center__section" :aria-label="t('alert.tab.rules')">
      <AlertRuleForm :initial-symbol="initialSymbol" :resolve-type="resolveType" @submit="addRule" />
      <ul v-if="alertStore.rules.length > 0" class="alert-center__rules">
        <li v-for="rule in alertStore.rules" :key="rule.id" class="alert-center__rule">
          <span class="alert-center__rule-symbol">{{ rule.symbol }}</span>
          <span class="alert-center__rule-text">{{ describeRule(rule) }}</span>
          <BaseSwitch
            :model-value="rule.isEnabled"
            :label="t('alert.enabled')"
            @update:model-value="alertStore.setRuleEnabled(rule.id, $event)"
          />
          <BaseIconButton icon="delete" :label="t('alert.deleteRule', { symbol: rule.symbol })" @click="alertStore.removeRule(rule.id)" />
        </li>
      </ul>
      <BaseEmptyState v-else icon="addAlert" :title="t('alert.noRules')" :text="t('alert.noRulesHint')" />
    </section>
    <section v-else class="alert-center__section" :aria-label="t('alert.tab.history')">
      <div class="alert-center__actions">
        <BaseButton variant="text" size="small" prepend-icon="markAllRead" :is-disabled="alertStore.unreadCount === 0" @click="alertStore.markAllRead()">
          {{ t('alert.markAllRead') }}
        </BaseButton>
        <BaseButton variant="text" size="small" color="error" prepend-icon="delete" :is-disabled="alertStore.events.length === 0" @click="alertStore.clearEvents()">
          {{ t('alert.clear') }}
        </BaseButton>
      </div>
      <AlertEventList :items="eventViews" @mark-read="alertStore.markRead" @select="selectSymbol" />
    </section>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseDialog from '@/components/base/BaseDialog.vue'
import BaseEmptyState from '@/components/base/BaseEmptyState.vue'
import BaseIconButton from '@/components/base/BaseIconButton.vue'
import BaseSwitch from '@/components/base/BaseSwitch.vue'
import BaseTabs from '@/components/base/BaseTabs.vue'
import { useAlertText } from '@/composables/useAlertText'
import type { AlertRuleDraft } from '@/interfaces/alert'
import type { InstrumentType } from '@/interfaces/market'
import type { TabItem } from '@/interfaces/ui'
import { useAlertStore } from '@/stores/useAlertStore'
import { useInstrumentStore } from '@/stores/useInstrumentStore'
import AlertEventList from './AlertEventList.vue'
import AlertRuleForm from './AlertRuleForm.vue'

type AlertTab = 'rules' | 'history'

/** Container: alert rules and triggered history (FR-32, FR-33). Loaded async on first open. */
const { initialSymbol = '' } = defineProps<{
  initialSymbol?: string
}>()

const emit = defineEmits<{
  select: [symbol: string]
}>()

const isOpen = defineModel<boolean>({ required: true })

const alertStore = useAlertStore()
const instrumentStore = useInstrumentStore()
const { t } = useI18n()
const { describeRule, toView } = useAlertText()

const tab = ref<AlertTab>(initialSymbol ? 'rules' : 'history')

const tabs = computed<TabItem<AlertTab>[]>(() => [
  { value: 'rules', label: t('alert.tab.rules'), count: alertStore.rules.length },
  { value: 'history', label: t('alert.tab.history'), count: alertStore.unreadCount },
])
const eventViews = computed(() => alertStore.events.map(toView))

function resolveType(symbol: string): InstrumentType | null {
  return instrumentStore.get(symbol)?.type ?? null
}

function addRule(draft: AlertRuleDraft): void {
  alertStore.addRule(draft)
}

function selectSymbol(symbol: string): void {
  isOpen.value = false
  emit('select', symbol)
}
</script>

<style scoped>
.alert-center__section {
  display: flex;
  flex-direction: column;
  gap: var(--mtg-space-3);
  padding-block-start: var(--mtg-space-3);
}

.alert-center__rules {
  margin: 0;
  padding: 0;
  list-style: none;
}

.alert-center__rule {
  display: grid;
  grid-template-columns: var(--mtg-board-col-symbol) 1fr auto auto;
  align-items: center;
  gap: var(--mtg-space-2);
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
}

.alert-center__rule-symbol {
  font-weight: var(--mtg-weight-bold);
}

.alert-center__rule-text {
  font-size: var(--mtg-font-body-sm);
}

.alert-center__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--mtg-space-2);
}
</style>
