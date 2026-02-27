'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import type { BreadcrumbItem } from '@/lib/navigation'

interface BreadcrumbContextValue {
  items: BreadcrumbItem[]
  accentColor: string | undefined
  setItems: (items: BreadcrumbItem[], accentColor?: string) => void
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  items: [],
  accentColor: undefined,
  setItems: () => {},
})

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [items, setItemsState] = useState<BreadcrumbItem[]>([])
  const [accentColor, setAccentColor] = useState<string | undefined>(undefined)

  function setItems(newItems: BreadcrumbItem[], newAccentColor?: string) {
    setItemsState(newItems)
    setAccentColor(newAccentColor)
  }

  return (
    <BreadcrumbContext.Provider value={{ items, accentColor, setItems }}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

export function useBreadcrumbs() {
  return useContext(BreadcrumbContext)
}

// BreadcrumbSetter — render in page to push breadcrumb state into context.
// No visual output. Uses useEffect to avoid SSR mismatch.
interface BreadcrumbSetterProps {
  items: BreadcrumbItem[]
  accentColor?: string
}

export function BreadcrumbSetter({ items, accentColor }: BreadcrumbSetterProps) {
  const { setItems } = useBreadcrumbs()
  // Use ref to track previous items to avoid infinite render loops
  const prevKey = useRef<string>('')

  useEffect(() => {
    const key = JSON.stringify({ items, accentColor })
    if (prevKey.current !== key) {
      prevKey.current = key
      setItems(items, accentColor)
    }
  }, [items, accentColor, setItems])

  return null
}
