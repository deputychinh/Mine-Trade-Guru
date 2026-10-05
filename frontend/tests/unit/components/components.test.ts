import { describe, expect, it } from 'vitest'
import AlertRuleForm from '@/components/features/alerts/AlertRuleForm.vue'
import ConnectionIndicator from '@/components/features/layout/ConnectionIndicator.vue'
import PriceBoardHeader from '@/components/features/price-board/PriceBoardHeader.vue'
import PriceCell from '@/components/features/price-board/PriceCell.vue'
import { COLUMNS } from '@/constants/priceBoardColumns'
import { mountWithPlugins } from '../../helpers/mountWithPlugins'

describe('PriceCell', () => {
  it('renders color class, marker and spoken label', () => {
    const wrapper = mountWithPlugins(PriceCell, {
      props: { text: '101.00', color: 'market-up', marker: '▲', ariaText: 'up', flashValue: 101_000, isFlashEnabled: true },
    })
    expect(wrapper.classes()).toContain('text-market-up')
    expect(wrapper.text()).toContain('▲')
    expect(wrapper.find('[aria-hidden="true"]').text()).toBe('▲')
    expect(wrapper.find('.d-sr-only').text()).toBe('up')
  })

  it('flashes when the value ticks', async () => {
    const wrapper = mountWithPlugins(PriceCell, { props: { text: '101.00', flashValue: 101_000, isFlashEnabled: true } })
    await wrapper.setProps({ text: '100.90', flashValue: 100_900 })
    expect(wrapper.classes().some((name) => name.startsWith('mtg-flash-down'))).toBe(true)
  })
})

describe('PriceBoardHeader', () => {
  it('emits sort for sortable columns and exposes aria-sort', async () => {
    const columns = COLUMNS.filter((column) => ['symbol', 'ceiling', 'changePercent'].includes(column.key))
    const wrapper = mountWithPlugins(PriceBoardHeader, {
      props: { columns, sort: { key: 'changePercent', direction: 'desc' } },
    })
    const sortable = wrapper.findAll('button')
    expect(sortable).toHaveLength(2)
    await sortable[1]?.trigger('click')
    expect(wrapper.emitted('sort')?.[0]).toEqual(['changePercent'])
    expect(wrapper.find('[aria-sort="descending"]').exists()).toBe(true)
  })
})

describe('AlertRuleForm', () => {
  const resolveType = (symbol: string) => (symbol === 'FPT' ? 'STOCK' : null)

  it('blocks unknown symbols and shows the error only after submit', async () => {
    const wrapper = mountWithPlugins(AlertRuleForm, { props: { initialSymbol: 'ZZZ', resolveType } })
    expect(wrapper.text()).not.toContain('Unknown symbol')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.text()).toContain('Unknown symbol')
  })

  it('emits the threshold in raw VND', async () => {
    const wrapper = mountWithPlugins(AlertRuleForm, { props: { initialSymbol: 'fpt', resolveType } })
    const inputs = wrapper.findAll('input')
    await inputs[inputs.length - 1]?.setValue('95.3')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')?.[0]).toEqual([{ symbol: 'FPT', condition: 'PRICE_ABOVE', threshold: 95_300 }])
  })
})

describe('ConnectionIndicator', () => {
  it('shows paused state and toggles', async () => {
    const wrapper = mountWithPlugins(ConnectionIndicator, { props: { status: 'open', isPaused: true, secondsSinceTick: 3 } })
    expect(wrapper.text()).toContain('Paused')
    expect(wrapper.text()).toContain('3s ago')
    await wrapper.find('button[aria-label="Resume updates (P)"]').trigger('click')
    expect(wrapper.emitted('togglePause')).toHaveLength(1)
  })
})
