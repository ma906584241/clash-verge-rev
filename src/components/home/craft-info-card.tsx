import { DeveloperBoardOutlined, RestartAltRounded } from '@mui/icons-material'
import { Divider, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import { useLockFn } from 'ahooks'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useCraft } from '@/hooks/use-craft'
import { useDisplayedMixedPort } from '@/hooks/use-displayed-mixed-port'
import { useAppUptime } from '@/hooks/use-system-state'
import {
  useCraftConfigData,
  useRulesData,
  useSystemData,
} from '@/providers/app-data-context'
import { restartCore } from '@/services/cmds'
import { mutate } from '@/services/mutate'

import { EnhancedCard } from './enhanced-card'

// 将毫秒转换为时:分:秒格式的函数
const formatUptime = (uptimeMs: number) => {
  const hours = Math.floor(uptimeMs / 3600000)
  const minutes = Math.floor((uptimeMs % 3600000) / 60000)
  const seconds = Math.floor((uptimeMs % 60000) / 1000)
  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export const CraftInfoCard = () => {
  const { t } = useTranslation()
  const { version: craftVersion } = useCraft()
  const { craftConfig } = useCraftConfigData()
  const displayedMixedPort = useDisplayedMixedPort()
  const { rules } = useRulesData()
  const uptime = useAppUptime()
  const { systemProxyAddress } = useSystemData()
  const [restarting, setRestarting] = useState(false)

  const onRestart = useLockFn(async () => {
    setRestarting(true)
    try {
      await mutate(() => restartCore(), {
        id: 'restart-core',
        successNotice: t(
          'settings.feedback.notifications.craft.restartSuccess',
        ),
      })
    } catch {
      // the funnel already notified
    } finally {
      setRestarting(false)
    }
  })

  // 使用useMemo缓存格式化后的uptime，避免频繁计算
  const formattedUptime = useMemo(() => formatUptime(uptime), [uptime])

  // 使用备忘录组件内容，减少重新渲染
  const cardContent = useMemo(() => {
    if (!craftConfig) return null

    return (
      <Stack spacing={1.5}>
        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            {t('home.components.craftInfo.fields.coreVersion')}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            {craftVersion || '-'}
          </Typography>
        </Stack>
        <Divider />
        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            {t('home.components.craftInfo.fields.systemProxyAddress')}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            {systemProxyAddress}
          </Typography>
        </Stack>
        <Divider />
        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            {t('home.components.craftInfo.fields.mixedPort')}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            {displayedMixedPort}
          </Typography>
        </Stack>
        <Divider />
        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            {t('home.components.craftInfo.fields.uptime')}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            {formattedUptime}
          </Typography>
        </Stack>
        <Divider />
        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            {t('home.components.craftInfo.fields.rulesCount')}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            {rules.length}
          </Typography>
        </Stack>
      </Stack>
    )
  }, [
    craftConfig,
    craftVersion,
    displayedMixedPort,
    t,
    formattedUptime,
    rules.length,
    systemProxyAddress,
  ])

  return (
    <EnhancedCard
      title={t('home.components.craftInfo.title')}
      icon={<DeveloperBoardOutlined />}
      iconColor="warning"
      action={
        <Tooltip title={t('shared.actions.restart')}>
          <span>
            <IconButton
              size="small"
              aria-label={t('shared.actions.restart')}
              loading={restarting}
              onClick={onRestart}
            >
              <RestartAltRounded />
            </IconButton>
          </span>
        </Tooltip>
      }
    >
      {cardContent}
    </EnhancedCard>
  )
}
