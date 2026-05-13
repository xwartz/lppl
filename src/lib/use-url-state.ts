import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export type URLStateConfig = {
  symbol: string
  days: number
  useCustomRange: boolean
  customStart: string
  customEnd: string
  maxIter: number
  restarts: number
  tol: number
  showAdvanced: boolean
}

export const useURLState = (defaults: URLStateConfig) => {
  const [searchParams, setSearchParams] = useSearchParams()

  // Initialize state from URL or defaults
  const getInitialValue = useCallback(
    <K extends keyof URLStateConfig>(
      key: K,
      parser: (value: string) => URLStateConfig[K],
    ): URLStateConfig[K] => {
      const urlValue = searchParams.get(key as string)
      if (urlValue !== null) {
        try {
          return parser(urlValue)
        } catch {
          return defaults[key]
        }
      }
      return defaults[key]
    },
    [searchParams, defaults],
  )

  // Parse URL parameters
  const [symbol, setSymbolState] = useState(() => getInitialValue('symbol', (v) => v.toUpperCase()))
  const [days, setDaysState] = useState(() =>
    getInitialValue('days', (v) => {
      const num = Number(v)
      return Number.isNaN(num) ? defaults.days : num
    }),
  )
  const [useCustomRange, setUseCustomRangeState] = useState(() =>
    getInitialValue('useCustomRange', (v) => v === 'true'),
  )
  const [customStart, setCustomStartState] = useState(() =>
    getInitialValue('customStart', (v) => v),
  )
  const [customEnd, setCustomEndState] = useState(() => getInitialValue('customEnd', (v) => v))
  const [maxIter, setMaxIterState] = useState(() =>
    getInitialValue('maxIter', (v) => {
      const num = Number(v)
      return Number.isNaN(num) ? defaults.maxIter : num
    }),
  )
  const [restarts, setRestartsState] = useState(() =>
    getInitialValue('restarts', (v) => {
      const num = Number(v)
      return Number.isNaN(num) ? defaults.restarts : num
    }),
  )
  const [tol, setTolState] = useState(() =>
    getInitialValue('tol', (v) => {
      const num = Number(v)
      return Number.isNaN(num) ? defaults.tol : num
    }),
  )
  const [showAdvanced, setShowAdvancedState] = useState(() =>
    getInitialValue('showAdvanced', (v) => v === 'true'),
  )

  // Update URL when state changes
  const updateURL = useCallback(
    (updates: Partial<URLStateConfig>) => {
      setSearchParams(
        (prev) => {
          const newParams = new URLSearchParams(prev)

          Object.entries(updates).forEach(([key, value]) => {
            if (value === undefined || value === null) {
              newParams.delete(key)
            } else {
              newParams.set(key, String(value))
            }
          })

          return newParams
        },
        { replace: true },
      ) // Use replace to avoid cluttering browser history
    },
    [setSearchParams],
  )

  // Wrapped setters that also update URL
  const setSymbol = useCallback(
    (value: string) => {
      setSymbolState(value)
      updateURL({ symbol: value })
    },
    [updateURL],
  )

  const setDays = useCallback(
    (value: number) => {
      setDaysState(value)
      updateURL({ days: value })
    },
    [updateURL],
  )

  const setUseCustomRange = useCallback(
    (value: boolean) => {
      setUseCustomRangeState(value)
      updateURL({ useCustomRange: value })
    },
    [updateURL],
  )

  const setCustomStart = useCallback(
    (value: string) => {
      setCustomStartState(value)
      updateURL({ customStart: value })
    },
    [updateURL],
  )

  const setCustomEnd = useCallback(
    (value: string) => {
      setCustomEndState(value)
      updateURL({ customEnd: value })
    },
    [updateURL],
  )

  const setMaxIter = useCallback(
    (value: number) => {
      setMaxIterState(value)
      updateURL({ maxIter: value })
    },
    [updateURL],
  )

  const setRestarts = useCallback(
    (value: number) => {
      setRestartsState(value)
      updateURL({ restarts: value })
    },
    [updateURL],
  )

  const setTol = useCallback(
    (value: number) => {
      setTolState(value)
      updateURL({ tol: value })
    },
    [updateURL],
  )

  const setShowAdvanced = useCallback(
    (value: boolean) => {
      setShowAdvancedState(value)
      updateURL({ showAdvanced: value })
    },
    [updateURL],
  )

  return {
    symbol,
    setSymbol,
    days,
    setDays,
    useCustomRange,
    setUseCustomRange,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    maxIter,
    setMaxIter,
    restarts,
    setRestarts,
    tol,
    setTol,
    showAdvanced,
    setShowAdvanced,
  }
}
