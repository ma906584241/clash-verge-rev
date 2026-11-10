import { useLockFn } from 'ahooks'
import i18n from 'i18next'
import { getVersion } from 'tauri-plugin-mihomo-api'

import {
  getCraftInfo,
  getCraftMode,
  getRuntimeConfig,
  patchCraftConfig,
} from '@/services/cmds'
import { mutate } from '@/services/mutate'
import {
  revalidateQuery,
  setCacheData,
  useQuery,
} from '@/services/query-client'

type MutateCraftUpdater =
  | ((old: IConfigData | undefined) => IConfigData | undefined)
  | IConfigData
  | undefined

const PORT_KEYS = [
  'port',
  'socks-port',
  'mixed-port',
  'redir-port',
  'tproxy-port',
] as const

type CraftInfoPatch = Partial<
  Pick<
    IConfigData,
    | 'port'
    | 'socks-port'
    | 'mixed-port'
    | 'redir-port'
    | 'tproxy-port'
    | 'external-controller'
    | 'secret'
  >
>

const hasCraftInfoPayload = (patch: CraftInfoPatch) =>
  PORT_KEYS.some((key) => patch[key] != null) ||
  patch['external-controller'] != null ||
  patch.secret != null

const validatePortRange = (port: number) => {
  if (port < 1000) {
    throw new Error(
      i18n.t(($) => $.settings.modals.craftPort.messages.portTooLow),
    )
  }
  if (port > 65535) {
    throw new Error(
      i18n.t(($) => $.settings.modals.craftPort.messages.portTooHigh),
    )
  }
}

const validatePorts = (patch: CraftInfoPatch) => {
  PORT_KEYS.forEach((key) => {
    const port = patch[key]
    if (!port) return
    validatePortRange(port)
  })
}

export const useRuntimeConfig = (shouldFetch: boolean = true) => {
  return useQuery({
    queryKey: ['getRuntimeConfig'],
    queryFn: getRuntimeConfig,
    enabled: shouldFetch,
  })
}

// Fault-tolerant fallback for the current proxy mode, read straight from the
// saved craft config on the backend (bypasses the strict BaseConfig path).
export const useCraftMode = (shouldFetch: boolean = true) => {
  return useQuery({
    queryKey: ['getCraftMode'],
    queryFn: getCraftMode,
    enabled: shouldFetch,
  })
}

export const useCraft = () => {
  const { data: craft, refetch } = useRuntimeConfig()

  const { data: versionData, refetch: mutateVersion } = useQuery({
    queryKey: ['getVersion'],
    queryFn: getVersion,
  })

  const mutateCraft = (updater?: MutateCraftUpdater, revalidate?: boolean) => {
    if (updater === undefined) {
      return refetch()
    }
    void setCacheData<IConfigData>(['getRuntimeConfig'], updater)
    if (revalidate !== false) {
      return refetch()
    }
    return Promise.resolve()
  }

  const patchCraft = useLockFn(async (patch: Partial<IConfigData>) => {
    await mutate(() => patchCraftConfig(patch), {
      id: 'patch-craft-config',
      revalidate: [['getRuntimeConfig']],
      errorNotice: false,
    })
  })

  const version = versionData?.meta
    ? `${versionData.version} Mihomo`
    : versionData?.version || '-'

  return {
    craft,
    version,
    mutateCraft,
    mutateVersion,
    patchCraft,
  }
}

export const useCraftInfo = () => {
  const { data: craftInfo, refetch: mutateInfo } = useQuery({
    queryKey: ['getCraftInfo'],
    queryFn: getCraftInfo,
  })

  const patchInfo = useLockFn(async (patch: CraftInfoPatch) => {
    if (!hasCraftInfoPayload(patch)) return

    validatePorts(patch)

    await mutate(() => patchCraftConfig(patch), {
      id: 'patch-craft-info',
      revalidate: [['getCraftInfo'], ['getCraftConfig']],
      errorNotice: false,
    })
  })

  const invalidateCraftConfig = () => revalidateQuery(['getCraftConfig'])

  return {
    craftInfo,
    mutateInfo,
    patchInfo,
    invalidateCraftConfig,
  }
}
