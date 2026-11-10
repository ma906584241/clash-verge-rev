import { useCraftInfo, useRuntimeConfig } from '@/hooks/use-craft'
import { useVerge } from '@/hooks/use-verge'
import { useCraftConfigData } from '@/providers/app-data-context'
import { resolveDisplayedMixedPort } from '@/utils/mixed-port'

export const useDisplayedMixedPort = () => {
  const { craftConfig } = useCraftConfigData()
  const { data: runtimeConfig } = useRuntimeConfig()
  const { craftInfo } = useCraftInfo()
  const { verge } = useVerge()

  return resolveDisplayedMixedPort({
    live: craftConfig?.mixedPort,
    runtime: runtimeConfig?.['mixed-port'],
    selected: verge?.verge_mixed_port,
    merge: craftInfo?.mixed_port,
  })
}
