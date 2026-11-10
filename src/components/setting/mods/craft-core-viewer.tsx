import {
  RestartAltRounded,
  SwitchAccessShortcutRounded,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
} from '@mui/material'
import { useLockFn } from 'ahooks'
import type { Ref } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { closeAllConnections } from 'tauri-plugin-mihomo-api'

import { BaseDialog, DialogRef } from '@/components/base'
import { useCraft, useCraftInfo } from '@/hooks/use-craft'
import { useVerge } from '@/hooks/use-verge'
import { changeCraftCore, restartCore, upgradeCraftCore } from '@/services/cmds'
import { mutate } from '@/services/mutate'
import { showNotice } from '@/services/notice-service'

import { useSettingDialog } from '../settings-search-context'

const VALID_CORE = [
  {
    name: 'Mihomo',
    core: 'verge-mihomo',
    chipKey: 'settings.modals.craftCore.variants.release',
  },
  {
    name: 'Mihomo Alpha',
    core: 'verge-mihomo-alpha',
    chipKey: 'settings.modals.craftCore.variants.alpha',
  },
]

export function CraftCoreViewer({ ref }: { ref?: Ref<DialogRef> }) {
  const { t } = useTranslation()

  const { verge, mutateVerge } = useVerge()
  const { mutateVersion } = useCraft()
  const { invalidateCraftConfig } = useCraftInfo()

  const [open, setOpen] = useState(false)
  const [upgrading, setUpgrading] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [changingCore, setChangingCore] = useState<string | null>(null)

  useSettingDialog(ref, 'craft-core-viewer', open, () => ({
    open: () => setOpen(true),
    close: () => setOpen(false),
  }))

  const { craft_core = 'verge-mihomo' } = verge ?? {}

  const onCoreChange = useLockFn(async (core: string) => {
    if (core === craft_core) return

    try {
      setChangingCore(core)
      void mutate(() => closeAllConnections(), {
        id: 'close-all-connections',
        errorNotice: false,
      })
      const result = await mutate(() => changeCraftCore(core), {
        id: 'change-craft-core',
        errorNotice: false,
      })
      if (!result.ok) return
      const errorMsg = result.value

      if (errorMsg) {
        showNotice.error(errorMsg)
        setChangingCore(null)
        return
      }

      mutateVerge()
      await new Promise((resolve) => setTimeout(resolve, 500))
      invalidateCraftConfig()
      mutateVersion()
    } catch (err) {
      showNotice.error(err)
    } finally {
      setChangingCore(null)
    }
  })

  const onRestart = useLockFn(async () => {
    try {
      setRestarting(true)
      await mutate(() => restartCore(), {
        id: 'restart-core',
        successNotice: t(
          'settings.feedback.notifications.craft.restartSuccess',
        ),
      })
      setRestarting(false)
    } catch {
      setRestarting(false)
    }
  })

  const onUpgrade = useLockFn(async () => {
    try {
      setUpgrading(true)
      await mutate(() => upgradeCraftCore(), {
        id: 'upgrade-craft-core',
        onFulfilled: (report) => {
          showNotice.success(
            report.upgraded
              ? t('settings.feedback.notifications.craft.versionUpdated')
              : t('settings.feedback.notifications.craft.alreadyLatestVersion'),
          )
        },
      })
    } catch {
      // the funnel already notified
    } finally {
      setUpgrading(false)
    }
  })

  return (
    <BaseDialog
      open={open}
      title={
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          {t('settings.sections.craft.form.fields.craftCore')}
          <Box>
            <Button
              variant="contained"
              size="small"
              startIcon={<SwitchAccessShortcutRounded />}
              loadingPosition="start"
              loading={upgrading}
              disabled={restarting || changingCore !== null}
              sx={{ marginRight: '8px' }}
              data-setting-target="core-upgrade"
              onClick={onUpgrade}
            >
              {t('shared.actions.upgrade')}
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<RestartAltRounded />}
              loadingPosition="start"
              loading={restarting}
              disabled={upgrading}
              data-setting-target="core-restart"
              onClick={onRestart}
            >
              {t('shared.actions.restart')}
            </Button>
          </Box>
        </Box>
      }
      contentSx={{
        pb: 0,
        width: 400,
        height: 180,
        overflowY: 'auto',
        userSelect: 'text',
        marginTop: '-8px',
      }}
      disableOk
      cancelBtn={t('shared.actions.close')}
      onClose={() => setOpen(false)}
      onCancel={() => setOpen(false)}
    >
      <List
        component="nav"
        data-settings-dialog="craft-core-viewer"
        data-setting-target="core-variants"
        tabIndex={-1}
      >
        {VALID_CORE.map((each) => (
          <ListItemButton
            key={each.core}
            selected={each.core === craft_core}
            onClick={() => onCoreChange(each.core)}
            disabled={changingCore !== null || restarting || upgrading}
          >
            <ListItemText primary={each.name} secondary={`/${each.core}`} />
            {changingCore === each.core ? (
              <CircularProgress size={20} sx={{ mr: 1 }} />
            ) : (
              <Chip label={t(each.chipKey)} size="small" />
            )}
          </ListItemButton>
        ))}
      </List>
    </BaseDialog>
  )
}
