import { Fragment } from 'react'

import { cn } from '@/lib/utils'

/**
 * Assistant text rendering.
 *
 * Model output is never injected as HTML — no `dangerouslySetInnerHTML`, no
 * markdown library with a raw-HTML escape hatch. This renderer understands
 * exactly four things (paragraphs, list items, `**bold**` and `` `code` ``) and
 * treats everything else as literal text. Anything a model emits that looks like
 * markup renders as the characters it is.
 */

export function RichText({ content, className }: { content: string; className?: string }) {
  const blocks = content.trim().split(/\n{2,}/)

  return (
    <div className={cn('space-y-3', className)}>
      {blocks.map((block, blockIndex) => {
        const lines = block.split('\n')
        const isList = lines.every((line) => /^\s*[-•*]\s+/.test(line)) && lines.length > 0

        if (isList) {
          return (
            <ul key={blockIndex} className="space-y-1.5 pl-1">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex} className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
                  <span>{renderInline(line.replace(/^\s*[-•*]\s+/, ''))}</span>
                </li>
              ))}
            </ul>
          )
        }

        return <p key={blockIndex}>{renderInline(block.replace(/\n/g, ' '))}</p>
      })}
    </div>
  )
}

export function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={index} className="font-medium text-ink">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={index} className="num rounded bg-sand/50 px-1 py-0.5 text-[0.85em] text-ink">
          {part.slice(1, -1)}
        </code>
      )
    }
    return <Fragment key={index}>{part}</Fragment>
  })
}
