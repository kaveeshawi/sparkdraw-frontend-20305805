import { useState } from 'react'
import {
  IconChartBar, IconAtom2, IconMoonStars, IconFlask2, IconSettings,
  IconFiles, IconPalette, IconCamera, IconRocket,
  IconDots, IconShare2, IconTrash, IconInfoCircle,
} from '@tabler/icons-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { resolveFolderIcon } from '@/lib/assetFolders'
import FolderDetailsDialog from './FolderDetailsDialog'

export const ICON_MAP = {
  chart: IconChartBar,
  atom: IconAtom2,
  moon: IconMoonStars,
  quantum: IconAtom2,
  flask: IconFlask2,
  gear: IconSettings,
  files: IconFiles,
  palette: IconPalette,
  camera: IconCamera,
  rocket: IconRocket,
}

/**
 * Fluent Emoji Flat — File Folder SVG (colorable via props).
 */
export function FolderGlyph({ color = '#fcd53f', tab = '#ffb02e', className }) {
  return (
    <svg
      className={className ? `sd-folder-glyph ${className}` : 'sd-folder-glyph'}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width="112"
      height="112"
      aria-hidden
    >
      <path d="M0 0h32v32H0z" fill="none" />
      <path
        fill={tab}
        d="m15.385 7.39l-2.477-2.475A3.12 3.12 0 0 0 10.698 4H4.126A2.125 2.125 0 0 0 2 6.125V13.5h28v-3.363a2.125 2.125 0 0 0-2.125-2.125H16.888a2.13 2.13 0 0 1-1.503-.621"
      />
      <path
        fill={color}
        d="M27.875 30H4.125A2.12 2.12 0 0 1 2 27.888V13.112C2 11.945 2.951 11 4.125 11h23.75c1.174 0 2.125.945 2.125 2.112v14.776A2.12 2.12 0 0 1 27.875 30"
      />
    </svg>
  )
}

export default function FolderCard({
  folder,
  fileCount = 0,
  canManage = false,
  onOpen,
  onShare,
  onDelete,
}) {
  const style = resolveFolderIcon(folder)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const showMenu = true

  return (
    <article className="sd-folder-tile">
      <div className="sd-folder-tile__card">
        {showMenu ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="sd-folder-tile__menu"
                aria-label={`Options for ${folder.name}`}
                onClick={(e) => e.stopPropagation()}
              >
                <IconDots size={18} stroke={1.75} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[11rem]">
              <DropdownMenuItem className="cursor-pointer gap-2" onSelect={() => setDetailsOpen(true)}>
                <IconInfoCircle size={15} />
                Folder details
              </DropdownMenuItem>
              {canManage && onShare ? (
                <DropdownMenuItem className="cursor-pointer gap-2" onSelect={() => onShare(folder)}>
                  <IconShare2 size={15} />
                  Share
                </DropdownMenuItem>
              ) : null}
              {canManage && onDelete ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                    onSelect={() => onDelete(folder)}
                  >
                    <IconTrash size={15} />
                    Delete
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        <button
          type="button"
          className="sd-folder-tile__hit"
          onClick={() => onOpen?.(folder)}
          aria-label={`Open ${folder.name}`}
        >
          <FolderGlyph color={style.color} tab={style.tab} />
          <span className="sd-folder-tile__name">{folder.name}</span>
        </button>
      </div>

      <FolderDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        folder={folder}
        fileCount={fileCount}
        onShare={canManage ? onShare : undefined}
      />
    </article>
  )
}
