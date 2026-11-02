import { flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ModelPlazaView from '../ModelPlazaView.vue'
import type { ModelPlazaResponse } from '@/api/modelPlaza'

const { getModelPlaza, auth, route } = vi.hoisted(() => ({
  getModelPlaza: vi.fn(),
  auth: { isAuthenticated: false },
  route: { query: {} as Record<string, string> },
}))
vi.mock('@/api/modelPlaza', () => ({ getModelPlaza }))
vi.mock('@/stores/app', () => ({ useAppStore: () => ({ fetchPublicSettings: vi.fn() }) }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => auth }))
vi.mock('vue-router', () => ({ useRoute: () => route }))

const catalog = (description: string): ModelPlazaResponse => ({
  description,
  groups: [{
    id: 1,
    name: description,
    description: '',
    platform: 'openai',
    subscription_type: 'standard',
    rate_multiplier: 1,
    peak_rate_enabled: false,
    peak_start: '',
    peak_end: '',
    peak_rate_multiplier: 1,
    is_exclusive: false,
    image_rate_independent: false,
    image_rate_multiplier: 1,
    video_rate_independent: false,
    video_rate_multiplier: 1,
    long_context_pricing_enabled: false,
    models: [{ name: `${description}-model`, platform: 'openai', pricing: null, official_pricing: null }],
  }],
})
const mountView = () => shallowMount(ModelPlazaView, {
  global: { stubs: { AppLayout: { template: '<div><slot /></div>' } } },
})
let wrapper: ReturnType<typeof mountView>
const content = () => wrapper.findComponent({ name: 'ModelPlazaContent' })

beforeEach(() => {
  getModelPlaza.mockReset().mockResolvedValue(catalog('initial'))
  auth.isAuthenticated = false
  route.query = {}
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
})
afterEach(() => { wrapper?.unmount(); vi.restoreAllMocks(); vi.useRealTimers() })

describe('model plaza refresh', () => {
  it('aborts pending requests and stops revalidation on unmount, ignoring late results after reopening', async () => {
    let resolveOld!: (value: ModelPlazaResponse) => void
    getModelPlaza.mockReturnValueOnce(new Promise<ModelPlazaResponse>((resolve) => { resolveOld = resolve }))
    wrapper = mountView()
    const signal = getModelPlaza.mock.calls[0]![0]?.signal as AbortSignal | undefined
    wrapper.unmount()
    expect(signal?.aborted).toBe(true)
    window.dispatchEvent(new Event('focus'))
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()
    expect(getModelPlaza).toHaveBeenCalledTimes(1)

    wrapper = mountView()
    await flushPromises()
    resolveOld(catalog('stale'))
    await flushPromises()
    expect(content().props('response')).toEqual(catalog('initial'))
    expect(getModelPlaza).toHaveBeenCalledTimes(2)
  })

  it('does not overlap refresh requests or replace the catalog with a loading screen', async () => {
    wrapper = mountView()
    await flushPromises()
    let resolveRefresh!: (value: ModelPlazaResponse) => void
    getModelPlaza.mockReturnValueOnce(new Promise<ModelPlazaResponse>((resolve) => { resolveRefresh = resolve }))
    await wrapper.get('button[aria-label="刷新模型目录"]').trigger('click')
    window.dispatchEvent(new Event('focus'))
    document.dispatchEvent(new Event('visibilitychange'))
    await wrapper.get('button[aria-label="刷新模型目录"]').trigger('click')
    expect(getModelPlaza).toHaveBeenCalledTimes(2)
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    expect(content().props('loading')).toBe(false)
    expect(content().props('response')).toEqual(catalog('initial'))
    resolveRefresh(catalog('latest'))
    await flushPromises()
    expect(content().props('response')).toEqual(catalog('latest'))
    expect(wrapper.get('button').attributes('disabled')).toBeUndefined()
  })

  it('allows retrying a failed initial load', async () => {
    getModelPlaza.mockRejectedValueOnce(new Error('offline'))
    wrapper = mountView()
    await flushPromises()
    expect(content().props('error')).toBe(true)
    expect(content().props('loading')).toBe(false)
    await wrapper.get('button[aria-label="刷新模型目录"]').trigger('click')
    await flushPromises()
    expect(content().props('error')).toBe(false)
    expect(content().props('response')).toEqual(catalog('initial'))
  })

  it('revalidates on focus and visible-tab return, coalescing paired browser events', async () => {
    vi.useFakeTimers()
    wrapper = mountView()
    await flushPromises()
    getModelPlaza.mockResolvedValue(catalog('fresh on return'))
    window.dispatchEvent(new Event('focus'))
    await flushPromises()
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()
    expect(getModelPlaza).toHaveBeenCalledTimes(2)
    expect(content().props('response')).toEqual(catalog('fresh on return'))

    vi.mocked(Object.getOwnPropertyDescriptor(document, 'visibilityState')!.get!).mockReturnValue('hidden')
    await vi.advanceTimersByTimeAsync(30000)
    window.dispatchEvent(new Event('focus'))
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()
    expect(getModelPlaza).toHaveBeenCalledTimes(2)

    vi.mocked(Object.getOwnPropertyDescriptor(document, 'visibilityState')!.get!).mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()
    expect(getModelPlaza).toHaveBeenCalledTimes(3)
  })

  it('keeps the last catalog visible on refresh failure and clears the warning on retry', async () => {
    wrapper = mountView()
    await flushPromises()
    getModelPlaza.mockRejectedValueOnce(new Error('secret token must never be rendered'))
    await wrapper.get('button[aria-label="刷新模型目录"]').trigger('click')
    await flushPromises()

    expect(content().props('response')).toEqual(catalog('initial'))
    expect(content().props('loading')).toBe(false)
    expect(content().props('error')).toBe(false)
    expect(wrapper.get('[role="status"]').text()).toContain('刷新失败')
    expect(wrapper.get('[role="status"]').text()).toContain('上次加载')
    expect(wrapper.text()).not.toContain('secret token')

    getModelPlaza.mockResolvedValueOnce(catalog('recovered'))
    await wrapper.get('button[aria-label="刷新模型目录"]').trigger('click')
    await flushPromises()
    expect(content().props('response')).toEqual(catalog('recovered'))
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it.each([false, true])('refreshes the catalog explicitly (embedded: %s)', async (embedded) => {
    auth.isAuthenticated = embedded
    route.query = embedded ? { embedded: '1' } : {}
    wrapper = mountView()
    await flushPromises()
    expect(content().props('response')).toEqual(catalog('initial'))

    getModelPlaza.mockResolvedValueOnce(catalog('updated account models and groups'))
    await wrapper.get('button[aria-label="刷新模型目录"]').trigger('click')
    await flushPromises()
    expect(getModelPlaza).toHaveBeenCalledTimes(2)
    expect(content().props('response')).toEqual(catalog('updated account models and groups'))
  })
})
