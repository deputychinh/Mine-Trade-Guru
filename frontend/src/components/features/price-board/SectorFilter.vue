<template>
  <v-chip-group v-model="sector" mandatory selected-class="text-primary" :aria-label="t('board.sectorFilter')" class="sector-filter">
    <BaseChip v-for="item in SECTORS" :key="item" :value="item" variant="outlined">
      {{ t(SECTOR_LABEL_KEYS[item]) }}
    </BaseChip>
  </v-chip-group>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import BaseChip from '@/components/base/BaseChip.vue'
import { SECTOR_LABEL_KEYS, SECTORS } from '@/constants/market'
import type { Sector } from '@/interfaces/market'

/** Sector picker for the Sectors board (FR-03). */
const sector = defineModel<Sector>({ required: true })

const { t } = useI18n()
</script>

<style scoped>
.sector-filter {
  padding-inline: var(--mtg-space-3);
}
</style>
