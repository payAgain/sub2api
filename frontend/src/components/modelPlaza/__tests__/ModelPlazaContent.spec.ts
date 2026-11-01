import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ModelPlazaContent from '../ModelPlazaContent.vue'
import type { ModelPlazaResponse } from '@/api/modelPlaza'
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/stores/app', () => ({ useAppStore: () => ({ cachedPublicSettings: null }) }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ isAuthenticated: true }) }))
vi.mock('@/composables/useClipboard', () => ({ useClipboard: () => ({ copyToClipboard: vi.fn() }) }))
const response = { description: '', groups: [
  { id: 1, name: '国产模型组', models: [{ name: 'deepseek-v3', platform: 'openai', pricing: null }], rate_multiplier: 1 },
  { id: 2, name: '国外模型', models: [{ name: 'claude-sonnet-4', platform: 'anthropic', pricing: null }], rate_multiplier: 1 }
] } as ModelPlazaResponse
const mountPlaza = () => mount(ModelPlazaContent, { props: { response, loading: false }, global: { stubs: { Icon: true, PlazaGroupSection: true, BaseDialog: true } } })
describe('model plaza browsing', () => {
  it('defaults to cards and filters by exact category and model family', async () => {
    const w = mountPlaza()
    expect(w.findAll('[data-model-card]')).toHaveLength(2)
    await w.get('[data-category="国产模型组"]').trigger('click')
    expect(w.findAll('[data-model-card]')).toHaveLength(1)
    expect(w.get('[data-model-card]').text()).toContain('deepseek-v3')
    await w.get('[aria-label="模型系列"]').setValue('Claude')
    expect(w.findAll('[data-model-card]')).toHaveLength(0)
  })
  it('searches IDs, switches table view and opens the correct model details', async () => {
    const w = mountPlaza()
    await w.get('input[type="search"]').setValue('CLAUDE')
    expect(w.findAll('[data-model-card]')).toHaveLength(1)
    await w.get('[data-details]').trigger('click')
    expect(w.findComponent({ name: 'BaseDialog' }).props('show')).toBe(true)
    await w.get('[aria-label="表格视图"]').trigger('click')
    expect(w.findAll('[data-model-card]')).toHaveLength(0)
    expect(w.findAll('tbody tr')).toHaveLength(1)
  })
})
