import { useLocalStorage } from 'foxact/use-local-storage'

const defaultCraftLog: ICraftLog = {
  enable: true,
  logLevel: 'INFO',
  logFilter: 'all',
  logOrder: 'asc',
}

export const useCraftLog = () =>
  useLocalStorage<ICraftLog>('craft-log', defaultCraftLog, {
    serializer: JSON.stringify,
    deserializer: JSON.parse,
  })
