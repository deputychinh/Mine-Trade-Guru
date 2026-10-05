import { describe, expect, it } from 'vitest'
import { DARK_SCHEME, LIGHT_SCHEME } from '@/constants/themeColors'
import type { ThemeColorName, ThemeScheme } from '@/interfaces/theme'
import { contrastRatio } from '@/utils/contrast'

// Design-system rule C7: text on its surface passes WCAG AA (4.5:1) in both schemes.

const AA = 4.5
const MARKET_TOKENS: ThemeColorName[] = ['market-ceiling', 'market-floor', 'market-reference', 'market-up', 'market-down']
const MARKET_SURFACES: ThemeColorName[] = ['surface', 'surface-container-low', 'surface-container', 'surface-container-high']

function onRolePairs(scheme: ThemeScheme): Array<[ThemeColorName, ThemeColorName]> {
  const names = Object.keys(scheme) as ThemeColorName[]
  const pairs = names
    .filter((name) => name.startsWith('on-'))
    .map((name) => [name, name.slice(3) as ThemeColorName] as [ThemeColorName, ThemeColorName])
    .filter(([, role]) => role in scheme)
  return [...pairs, ['inverse-on-surface', 'inverse-surface']]
}

describe.each([
  ['light', LIGHT_SCHEME],
  ['dark', DARK_SCHEME],
])('%s scheme', (_name, scheme) => {
  it.each(onRolePairs(scheme))('%s on %s ≥ 4.5:1', (text, background) => {
    expect(contrastRatio(scheme[text], scheme[background])).toBeGreaterThanOrEqual(AA)
  })

  for (const token of MARKET_TOKENS) {
    it.each(MARKET_SURFACES)(`${token} on %s ≥ 4.5:1`, (surface) => {
      expect(contrastRatio(scheme[token], scheme[surface])).toBeGreaterThanOrEqual(AA)
    })
  }
})

it('both schemes define the same colors', () => {
  expect(Object.keys(LIGHT_SCHEME).sort()).toEqual(Object.keys(DARK_SCHEME).sort())
})
