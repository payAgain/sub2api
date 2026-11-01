import type { ModelPlazaGroup, PlazaModel } from '@/api/modelPlaza'
import { formatScaled, resolveIntervalPrices } from '@/utils/pricing'

export const categoryNames = ['国产模型组', '国外模型', '国产无限制模型', '国外无限制模型'] as const

/** Only recognize explicit model ID prefixes; family does not imply capabilities. */
export function modelFamily(name: string): string {
  const id = name.split('/').pop()?.toLowerCase() ?? ''
  const families: [RegExp, string][] = [
    [/^(gpt-|chatgpt-|o[134](?:-|$))/, 'GPT / o 系列'],
    [/^claude(?:-|$)/, 'Claude'], [/^gemini(?:-|$)/, 'Gemini'],
    [/^deepseek(?:-|$)/, 'DeepSeek'], [/^(qwen|qwq)(?:[\d.-]|$)/, 'Qwen'],
    [/^glm(?:[\d.-]|$)/, 'GLM'], [/^(kimi|moonshot)(?:[\d.-]|$)/, 'Kimi'],
    [/^doubao(?:[\d.-]|$)/, 'Doubao'], [/^minimax(?:[\d.-]|$)/, 'MiniMax'],
    [/^grok(?:[\d.-]|$)/, 'Grok'], [/^llama(?:[\d.-]|$)/, 'Llama'],
    [/^mistral(?:[\d.-]|$)/, 'Mistral']
  ]
  return families.find(([pattern]) => pattern.test(id))?.[1] ?? '其他'
}

/** Standard-period first-tier summary. Full billing rules stay in the existing detail table. */
export function priceSummary(model: PlazaModel, group: ModelPlazaGroup) {
  const pricing = model.pricing
  const token = !pricing?.billing_mode || pricing.billing_mode === 'token'
  const intervals = [...(pricing?.intervals ?? [])].sort((a, b) => a.min_tokens - b.min_tokens)
  const base = pricing && intervals[0] && token ? resolveIntervalPrices(intervals[0], pricing) : pricing
  let rate = group.user_rate_multiplier ?? group.rate_multiplier
  if (pricing?.billing_mode === 'image' && group.image_rate_independent) rate = group.image_rate_multiplier ?? 1
  if (pricing?.billing_mode === 'video' && group.video_rate_independent) rate = Math.max(0, group.video_rate_multiplier ?? 1)
  const format = (value: number | null | undefined) => value == null ? '—' : formatScaled(value * rate, token ? 1_000_000 : 1, 2)
  return {
    input: format(token ? base?.input_price : intervals.find(iv => iv.per_request_price != null)?.per_request_price ?? pricing?.per_request_price),
    output: token ? format(base?.output_price) : null,
    unit: token ? 'USD / 1M tokens' : pricing?.billing_mode === 'image' ? 'USD / 张' : 'USD / 次',
    tiered: intervals.length > 0,
    token
  }
}
