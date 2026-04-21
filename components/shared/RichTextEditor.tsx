'use client'

import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import LinkExtension from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, List, ListOrdered, Link2, Unlink,
  Strikethrough, Code,
} from 'lucide-react'
import { useCallback, useEffect, useImperativeHandle, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface RichTextEditorHandle {
  getEditor: () => Editor | null
  clearContent: () => void
  setContent: (html: string) => void
  focus: () => void
}

interface Props {
  value?: string
  onChange?: (html: string) => void
  onEditorReady?: (editor: Editor) => void
  onKeyDown?: (event: KeyboardEvent) => boolean | undefined
  placeholder?: string
  className?: string
  minHeight?: string
}

function ToolbarButton({
  active, onClick, title, children,
}: {
  active?: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      className={cn(
        'p-1.5 rounded transition-colors',
        active
          ? 'bg-indigo-100 text-indigo-700'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800',
      )}
    >
      {children}
    </button>
  )
}

export const RichTextEditor = forwardRef<RichTextEditorHandle, Props>(
  function RichTextEditor({ value, onChange, onEditorReady, onKeyDown, placeholder, className, minHeight = '80px' }, ref) {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({ codeBlock: false }),
        LinkExtension.configure({
          openOnClick: false,
          autolink: true,
          HTMLAttributes: {
            class: 'text-indigo-600 underline underline-offset-2 cursor-pointer',
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        }),
        Placeholder.configure({
          placeholder: placeholder ?? 'Escreva aqui...',
        }),
      ],
      content: value || '',
      onUpdate: ({ editor }) => {
        const html = editor.getHTML()
        // treat empty editor as empty string
        const isEmpty = editor.isEmpty
        onChange?.(isEmpty ? '' : html)
      },
      editorProps: {
        attributes: { class: 'outline-none' },
        handleKeyDown: (_view, event) => {
          if (onKeyDown) return onKeyDown(event) ?? false
          return false
        },
      },
    })

    useImperativeHandle(ref, () => ({
      getEditor: () => editor,
      clearContent: () => editor?.commands.clearContent(),
      setContent: (html: string) => editor?.commands.setContent(html),
      focus: () => editor?.commands.focus(),
    }))

    useEffect(() => {
      if (editor && onEditorReady) onEditorReady(editor)
    }, [editor, onEditorReady])

    // Sync external value changes (e.g. when modal opens with prefilled content)
    useEffect(() => {
      if (!editor) return
      if (value === undefined) return
      const current = editor.getHTML()
      if (value !== current) {
        editor.commands.setContent(value || '')
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value])

    const setLink = useCallback(() => {
      if (!editor) return
      const prev = editor.getAttributes('link').href || ''
      const url = window.prompt('URL do link:', prev)
      if (url === null) return
      if (url === '') {
        editor.chain().focus().unsetLink().run()
        return
      }
      const href = url.startsWith('http') ? url : `https://${url}`
      editor.chain().focus().setLink({ href }).run()
    }, [editor])

    if (!editor) return null

    return (
      <div className={cn('rounded-lg border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-indigo-300 focus-within:border-indigo-400 transition-shadow', className)}>
        {/* Toolbar */}
        <div className="flex items-center gap-0.5 px-2 py-1 border-b border-gray-100 bg-gray-50/60 rounded-t-lg flex-wrap">
          <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrito (Ctrl+B)">
            <Bold size={14} />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Itálico (Ctrl+I)">
            <Italic size={14} />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Tachado">
            <Strikethrough size={14} />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} title="Código inline">
            <Code size={14} />
          </ToolbarButton>

          <div className="w-px h-4 bg-gray-200 mx-1" />

          <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista com marcadores">
            <List size={14} />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada">
            <ListOrdered size={14} />
          </ToolbarButton>

          <div className="w-px h-4 bg-gray-200 mx-1" />

          <ToolbarButton active={editor.isActive('link')} onClick={setLink} title="Inserir link">
            <Link2 size={14} />
          </ToolbarButton>
          {editor.isActive('link') && (
            <ToolbarButton active={false} onClick={() => editor.chain().focus().unsetLink().run()} title="Remover link">
              <Unlink size={14} />
            </ToolbarButton>
          )}
        </div>

        {/* Editor area */}
        <EditorContent
          editor={editor}
          className="px-3 py-2 text-sm text-gray-800 [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[var(--editor-min-h)]
            [&_.ProseMirror_p]:my-1
            [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-4 [&_.ProseMirror_ul]:my-1
            [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-4 [&_.ProseMirror_ol]:my-1
            [&_.ProseMirror_li]:my-0.5
            [&_.ProseMirror_strong]:font-bold
            [&_.ProseMirror_em]:italic
            [&_.ProseMirror_s]:line-through
            [&_.ProseMirror_code]:bg-gray-100 [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:text-xs [&_.ProseMirror_code]:font-mono
            [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0"
          style={{ '--editor-min-h': minHeight } as React.CSSProperties}
        />
      </div>
    )
  }
)
