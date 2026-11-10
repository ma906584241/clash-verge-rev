import React, { useCallback, useMemo, useRef } from 'react'
import {
  getBaseConfig,
  getRuleProviders,
  getRules,
} from 'tauri-plugin-mihomo-api'

import { useCraftInfo, useRuntimeConfig } from '@/hooks/use-craft'
import { useVerge } from '@/hooks/use-verge'
import { getProxyView, getSystemProxy } from '@/services/cmds'
import { useQuery } from '@/services/query-client'
import { useRunState } from '@/store/app-store-context'
import { resolveDisplayedMixedPort } from '@/utils/mixed-port'

import {
  CraftConfigContext,
  CoreDataStatusContext,
  ProxiesContext,
  RefreshersContext,
  RulesContext,
  SystemContext,
} from './app-data-context'

const TQ_MIHOMO = {
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  staleTime: 1500,
  retry: 3,
  // SWR's default retry waits about 2^retryCount * errorRetryInterval with
  // jitter, so 100 reproduces the previous 200 * 2^attempt backoff.
  retryDelay: 100,
} as const

const TQ_DEFAULTS = {
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  staleTime: 5000,
  retry: 2,
} as const

function useStableFn<T extends (...args: any[]) => any>(fn: T): T {
  const ref = useRef(fn)
  ref.current = fn
  return useCallback((...args: Parameters<T>) => ref.current(...args), []) as T
}

// 全局数据提供者组件
export const AppDataProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const { verge } = useVerge()
  const { data: runtimeConfig } = useRuntimeConfig()
  const { craftInfo } = useCraftInfo()

  const {
    data: proxyView,
    error: proxyViewError,
    isPending: isProxyViewPending,
    refetch: _refetchProxyView,
  } = useQuery({
    queryKey: ['getProxyView'],
    queryFn: getProxyView,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
    ...TQ_MIHOMO,
  })

  const {
    data: craftConfig,
    isPending: isCraftConfigPending,
    refetch: _refetchCraftConfig,
  } = useQuery({
    queryKey: ['getCraftConfig'],
    queryFn: getBaseConfig,
    ...TQ_MIHOMO,
  })

  const { data: ruleProviders, refetch: _refetchRuleProviders } = useQuery({
    queryKey: ['getRuleProviders'],
    queryFn: getRuleProviders,
    ...TQ_MIHOMO,
    revalidateOnMount: false,
  })

  const { data: rulesData, refetch: _refetchRules } = useQuery({
    queryKey: ['getRules'],
    queryFn: getRules,
    ...TQ_MIHOMO,
  })

  const { data: sysproxy, refetch: _refetchSysproxy } = useQuery({
    queryKey: ['getSystemProxy'],
    queryFn: getSystemProxy,
    ...TQ_DEFAULTS,
  })

  // Store-owned run state; the event bus and the store's safety net write it.
  const runState = useRunState()
  const isRunningModePending = runState == null
  const runningMode = runState?.mode

  const refreshProxy = useStableFn(_refetchProxyView)
  const refreshCraftConfig = useStableFn(_refetchCraftConfig)
  const refreshRules = useStableFn(_refetchRules)
  const refreshSysproxy = useStableFn(_refetchSysproxy)
  const refreshRuleProviders = useStableFn(_refetchRuleProviders)

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshProxy(),
      refreshCraftConfig(),
      refreshRules(),
      refreshSysproxy(),
      refreshRuleProviders(),
    ])
  }, [
    refreshProxy,
    refreshCraftConfig,
    refreshRules,
    refreshSysproxy,
    refreshRuleProviders,
  ])

  const proxiesValue = useMemo(
    () => ({
      proxyView,
      isProxyViewPending,
      isProxyViewError: Boolean(proxyViewError),
    }),
    [proxyView, isProxyViewPending, proxyViewError],
  )

  const rulesValue = useMemo(
    () => ({
      rules: rulesData?.rules ?? [],
      ruleProviders: ruleProviders?.providers || {},
    }),
    [rulesData, ruleProviders],
  )

  const craftConfigValue = useMemo(
    () => ({
      craftConfig,
      isCraftConfigPending,
    }),
    [craftConfig, isCraftConfigPending],
  )

  // Resolved from local sources rather than via useDisplayedMixedPort: that hook reads the
  // CraftConfig context, and this component is the one providing it.
  const displayedMixedPort = resolveDisplayedMixedPort({
    live: craftConfig?.mixedPort,
    runtime: runtimeConfig?.['mixed-port'],
    selected: verge?.verge_mixed_port,
    merge: craftInfo?.mixed_port,
  })

  const systemValue = useMemo(() => {
    const calculateSystemProxyAddress = () => {
      if (!verge) return '-'

      const isPacMode = verge.proxy_auto_config ?? false

      if (isPacMode) {
        // PAC模式：显示我们期望设置的代理地址
        const proxyHost = verge.proxy_host || '127.0.0.1'
        return `${proxyHost}:${displayedMixedPort}`
      } else {
        // HTTP代理模式：优先使用系统地址，但如果格式不正确则使用期望地址
        const systemServer = sysproxy?.server
        if (
          systemServer &&
          systemServer !== '-' &&
          !systemServer.startsWith(':')
        ) {
          return systemServer
        } else {
          // 系统地址无效，返回期望的代理地址
          const proxyHost = verge.proxy_host || '127.0.0.1'
          return `${proxyHost}:${displayedMixedPort}`
        }
      }
    }

    return {
      sysproxy,
      runningMode,
      isRunningModePending,
      systemProxyAddress: calculateSystemProxyAddress(),
    }
  }, [sysproxy, runningMode, isRunningModePending, verge, displayedMixedPort])

  const coreDataStatusValue = useMemo(
    () => ({
      isCoreDataPending: isProxyViewPending || isCraftConfigPending,
    }),
    [isProxyViewPending, isCraftConfigPending],
  )

  const refreshersValue = useMemo(
    () => ({
      refreshProxy,
      refreshCraftConfig,
      refreshRules,
      refreshSysproxy,
      refreshRuleProviders,
      refreshAll,
    }),
    [
      refreshProxy,
      refreshCraftConfig,
      refreshRules,
      refreshSysproxy,
      refreshRuleProviders,
      refreshAll,
    ],
  )

  return (
    <ProxiesContext value={proxiesValue}>
      <RulesContext value={rulesValue}>
        <CraftConfigContext value={craftConfigValue}>
          <SystemContext value={systemValue}>
            <CoreDataStatusContext value={coreDataStatusValue}>
              <RefreshersContext value={refreshersValue}>
                {children}
              </RefreshersContext>
            </CoreDataStatusContext>
          </SystemContext>
        </CraftConfigContext>
      </RulesContext>
    </ProxiesContext>
  )
}
