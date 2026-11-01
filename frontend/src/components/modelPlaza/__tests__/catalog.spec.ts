import { describe, expect, it } from 'vitest'
import { modelFamily, priceSummary, categoryNames } from '../catalog'
import type { ModelPlazaGroup, PlazaModel } from '@/api/modelPlaza'

const group = { rate_multiplier: 2, user_rate_multiplier: 0.5 } as ModelPlazaGroup
const model = { name: 'gpt-5', pricing: { billing_mode: 'token', input_price: 0.000002, output_price: 0.000008, intervals: [] } } as unknown as PlazaModel

describe('model catalog', () => {
  it('uses the exact configured categories and conservative ID families', () => {
    expect(categoryNames).toEqual(['国产模型组', '国外模型', '国产无限制模型', '国外无限制模型'])
    expect(modelFamily('vendor/claude-sonnet-4')).toBe('Claude')
    expect(modelFamily('my-gpt-proxy')).toBe('其他')
    expect(modelFamily('deepseek-v3')).toBe('DeepSeek')
  })
  it('converts token prices to USD per million with the user rate including zero', () => {
    expect(priceSummary(model, group)).toMatchObject({ input: '$1.00', output: '$4.00', unit: 'USD / 1M tokens' })
    expect(priceSummary(model, { ...group, user_rate_multiplier: 0 }).input).toBe('$0.00')
  })
  it('resolves the first context tier instead of misrepresenting base pricing', () => {
    const tiered = { ...model, pricing: { ...model.pricing!, intervals: [{ min_tokens: 200000, input_multiplier: 3 }, { min_tokens: 0, input_multiplier: 2 }] } } as PlazaModel
    expect(priceSummary(tiered, group)).toMatchObject({ input: '$2.00', tiered: true })
  })
  it('keeps image and request prices in their own units and unknown prices absent', () => {
    const image = { ...model, pricing: { ...model.pricing!, billing_mode: 'image', per_request_price: 0.04 } } as PlazaModel
    expect(priceSummary(image, { ...group, image_rate_independent: true, image_rate_multiplier: 3 })).toMatchObject({ input: '$0.12', unit: 'USD / 张', output: null })
    expect(priceSummary({ ...model, pricing: null }, group).input).toBe('—')
  })
})
