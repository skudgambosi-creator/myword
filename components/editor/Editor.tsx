'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Image from '@tiptap/extension-image'
import BulletList from '@tiptap/extension-bullet-list'
import ListItem from '@tiptap/extension-list-item'
import { createClient } from '@/lib/supabase/client'
import { useRef } from 'react'

const ToolbarButton = ({ onClick, isActive, children, title }: any) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={isActive ? 'is-active' : ''}
    style={{ fontFamily: 'Courier New', fontSize: 12, fontWeight: 'bold' }}
  >
    {children}
  </button>
)

export default function Editor({
  content,
  onChange,
  groupId,
}: {
  content: string
  onChange: (html: string) => void
  groupId: string
}) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ bulletList: false }),
      Underline,
      BulletList,
      ListItem,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ inline: true, allowBase64: false }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: 'tiptap-editor' },
    },
  })

  if (!editor) return null

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const fileName = `${groupId}/${user.id}/${Date.now()}-${file.name}`
    const { error } = await supabase.storage
      .from('submission-images')
      .upload(fileName, file, { contentType: file.type })

    if (!error) {
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/submission-images/${fileName}`
      editor.chain().focus().setImage({ src: url }).run()
    }
    e.target.value = ''
  }

  return (
    <div>
      <div className="tiptap-toolbar">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')} title="Bold">B</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')} title="Italic"><em>I</em></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')} title="Underline"><u>U</u></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')} title="Bullet list">≡</ToolbarButton>

        <span style={{ borderLeft: '1px solid #ccc', margin: '0 4px' }} />

        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })} title="Align left">⬤</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })} title="Align centre">◉</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })} title="Align right">○</ToolbarButton>

        <span style={{ borderLeft: '1px solid #ccc', margin: '0 4px' }} />

        <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Insert image">
          IMG
        </ToolbarButton>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleImageUpload} style={{ display: 'none' }} />
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}
