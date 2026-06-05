import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus } from 'lucide-react'
import type { Icon } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getCommandPaletteSectionsForRole } from '@/components/layout/sidebar/nav-config'
import { NavIcon } from '@/components/layout/sidebar/nav-icon'
import useAuthStore from '@/store/authStore'
import { cn } from '@/lib/utils'

type CommandPaletteProps = {
  onNewProject?: () => void
  mode?: 'bar' | 'icon'
}

type SearchItem = {
  id: string
  title: string
  href?: string
  icon?: Icon
  section?: string
  action?: 'newProject'
}

function buildSearchItems(onNewProject: (() => void) | undefined, userRole: string | undefined): SearchItem[] {
  const items: SearchItem[] = []

  if (onNewProject) {
    items.push({
      id: 'action-new-project',
      title: 'New project',
      section: 'Actions',
      action: 'newProject',
    })
  }

  getCommandPaletteSectionsForRole(userRole).forEach((group) => {
    group.items.forEach((item) => {
      items.push({
        id: `${group.title ?? 'nav'}-${item.title}-${item.href}`,
        title: item.title,
        href: item.href,
        icon: item.icon,
        section: group.title || 'Navigation',
      })
    })
  })

  return items
}

function SearchResults({
  grouped,
  filtered,
  onSelect,
}: {
  grouped: [string, SearchItem[]][]
  filtered: SearchItem[]
  onSelect: (item: SearchItem) => void
}) {
  if (filtered.length === 0) {
    return <p className="sd-header-search-empty">No results found.</p>
  }

  return grouped.map(([section, items]) => (
    <div key={section} className="sd-header-search-group">
      <p className="sd-header-search-group-label">{section}</p>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="option"
          className="sd-header-search-option"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSelect(item)}
        >
          {item.action === 'newProject' ? (
            <Plus className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            item.icon && <NavIcon icon={item.icon} />
          )}
          <span>{item.title}</span>
        </button>
      ))}
    </div>
  ))
}

function SearchField({
  query,
  onQueryChange,
  onFocus,
  onKeyDown,
  inputRef,
  open,
}: {
  query: string
  onQueryChange: (value: string) => void
  onFocus: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  inputRef: React.RefObject<HTMLInputElement | null>
  open?: boolean
}) {
  return (
    <div className={cn('sd-header-search-field', open && 'sd-header-search-field--open')}>
      <Search className="size-[1.125rem] shrink-0 text-[#64748b]" strokeWidth={2.25} aria-hidden />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        className="sd-header-search-input"
        placeholder="Search..."
        aria-label="Search here"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
      />
    </div>
  )
}

export default function CommandPalette({ onNewProject, mode = 'bar' }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const allItems = useMemo(
    () => buildSearchItems(onNewProject, user?.role),
    [onNewProject, user?.role],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allItems.slice(0, 8)
    return allItems.filter((item) => item.title.toLowerCase().includes(q)).slice(0, 10)
  }, [allItems, query])

  const grouped = useMemo(() => {
    const map = new Map<string, SearchItem[]>()
    filtered.forEach((item) => {
      const key = item.section || 'Results'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    })
    return Array.from(map.entries())
  }, [filtered])

  const selectItem = (item: SearchItem) => {
    setOpen(false)
    setQuery('')
    if (item.action === 'newProject') {
      onNewProject?.()
      return
    }
    if (item.href) navigate(item.href)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
    if (e.key === 'Enter' && filtered[0]) {
      e.preventDefault()
      selectItem(filtered[0])
    }
  }

  useEffect(() => {
    if (mode !== 'bar') return
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [mode])

  useEffect(() => {
    if (mode === 'icon' && open) {
      window.setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [mode, open])

  if (mode === 'icon') {
    return (
      <DropdownMenu
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setQuery('')
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="sd-header-icon-btn shrink-0"
            aria-label="Search"
          >
            <Search className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="sd-header-search-panel w-80 p-0"
          align="end"
          sideOffset={8}
        >
          <div className="border-b border-border p-3">
            <SearchField
              query={query}
              onQueryChange={(value) => {
                setQuery(value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
              inputRef={inputRef}
              open={open}
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-1" role="listbox">
            <SearchResults grouped={grouped} filtered={filtered} onSelect={selectItem} />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div ref={containerRef} className={cn('sd-header-search', open && 'sd-header-search--active')}>
      <SearchField
        query={query}
        onQueryChange={(value) => {
          setQuery(value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        inputRef={inputRef}
        open={open}
      />

      {open && (
        <div className="sd-header-search-dropdown sd-header-search-dropdown--popover" role="listbox">
          <SearchResults grouped={grouped} filtered={filtered} onSelect={selectItem} />
        </div>
      )}
    </div>
  )
}
