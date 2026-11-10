import type { Update } from '@tauri-apps/plugin-updater'

// CraftVPN does not query update servers, so this never downloads a Clash Verge build.
export const checkUpdateSafe = async (): Promise<Update | null> => {
  return null
}
