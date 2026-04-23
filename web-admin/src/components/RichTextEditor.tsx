import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Undo, Redo } from 'lucide-react'
import { useEffect } from 'react'

interface Props {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  minHeight?: string
}

export default function RichTextEditor({ value, onChange, placeholder = 'Unesite tekst...', minHeight = '180px' }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '')
    }
  }, [value])

  if (!editor) return null

  const btn = (active: boolean, action: () => void, icon: React.ReactNode, title: string) => (
    <button type="button" title={title} onClick={action}
      className={`p-1.5 rounded transition-colors ${
        active ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
      }`}>
      {icon}
    </button>
  )

  const setLink = () => {
    const url = window.prompt('URL:', editor.getAttributes('link').href || '')
    if (url === null) return
    if (url === '') { editor.chain().focus().unsetLink().run(); return }
    editor.chain().focus().setLink({ href: url }).run()
  }

  return (
    <div className="border border-slate-300 rounded-lg overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-2 py-1.5 flex flex-wrap gap-0.5">
        {btn(false, () => editor.chain().focus().undo().run(), <Undo size={15} />, 'Poništi')}
        {btn(false, () => editor.chain().focus().redo().run(), <Redo size={15} />, 'Ponovi')}
        <div className="w-px bg-slate-300 mx-1" />
        {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <Bold size={15} />, 'Podebljano')}
        {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <Italic size={15} />, 'Kurziv')}
        {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), <UnderlineIcon size={15} />, 'Podvučeno')}
        {btn(editor.isActive('link'), setLink, <LinkIcon size={15} />, 'Link')}
        <div className="w-px bg-slate-300 mx-1" />
        {btn(editor.isActive({ textAlign: 'left' }), () => editor.chain().focus().setTextAlign('left').run(), <AlignLeft size={15} />, 'Lijevo')}
        {btn(editor.isActive({ textAlign: 'center' }), () => editor.chain().focus().setTextAlign('center').run(), <AlignCenter size={15} />, 'Centar')}
        {btn(editor.isActive({ textAlign: 'right' }), () => editor.chain().focus().setTextAlign('right').run(), <AlignRight size={15} />, 'Desno')}
        <div className="w-px bg-slate-300 mx-1" />
        {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), <List size={15} />, 'Lista')}
        {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered size={15} />, 'Numerirano')}
        <div className="w-px bg-slate-300 mx-1" />
        <select className="text-xs border-0 bg-transparent text-slate-600"
          onChange={e => {
            const v = e.target.value
            if (v === 'p') editor.chain().focus().setParagraph().run()
            else editor.chain().focus().setHeading({ level: parseInt(v) as 1|2|3 }).run()
          }}
          value={editor.isActive('heading', {level:1}) ? '1' : editor.isActive('heading', {level:2}) ? '2' : editor.isActive('heading', {level:3}) ? '3' : 'p'}>
          <option value="p">Paragraf</option>
          <option value="1">Naslov 1</option>
          <option value="2">Naslov 2</option>
          <option value="3">Naslov 3</option>
        </select>
      </div>
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-3 focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[180px]"
        style={{ minHeight }}
      />
    </div>
  )
}
