'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import { Node, mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Image from '@tiptap/extension-image'
import BulletList from '@tiptap/extension-bullet-list'
import ListItem from '@tiptap/extension-list-item'
import Color from '@tiptap/extension-color'
import TextStyle from '@tiptap/extension-text-style'
import { createClient } from '@/lib/supabase/client'
import { useRef, useState } from 'react'

const AudioNode = Node.create({
  name: 'audio',
  group: 'block',
  atom: true,
  addAttributes() {
    return { src: { default: null } }
  },
  parseHTML() {
    return [{ tag: 'audio' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['audio', mergeAttributes({ controls: 'controls', style: 'width:100%;margin:8px 0' }, HTMLAttributes)]
  },
})

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
  const audioInputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState('')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ bulletList: false }),
      Underline,
      BulletList,
      ListItem,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Image.configure({ inline: true, allowBase64: false }),
      AudioNode,
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
    setUploadError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    const fileName = `${groupId}/${user.id}/${Date.now()}-${safeName}`
    const { error } = await supabase.storage
      .from('submission-images')
      .upload(fileName, file, { contentType: file.type })

    if (error) {
      setUploadError(`Image upload failed: ${error.message}`)
    } else {
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/submission-images/${fileName}`
      editor.chain().focus().setImage({ src: url }).run()
    }
    e.target.value = ''
  }

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    const fileName = `${groupId}/${user.id}/${Date.now()}-${safeName}`
    const { error } = await supabase.storage
      .from('submission-audio')
      .upload(fileName, file, { contentType: file.type })

    if (error) {
      setUploadError(`Audio upload failed: ${error.message}`)
    } else {
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/submission-audio/${fileName}`
      editor.chain().focus().insertContent({ type: 'audio', attrs: { src: url } }).run()
    }
    e.target.value = ''
  }

  return (
    <div>
      {uploadError && (
        <div style={{ border: '2px solid #CC0000', padding: '6px 10px', marginBottom: 8, fontSize: 12, color: '#CC0000' }}>
          {uploadError}
        </div>
      )}
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

        <ToolbarButton
          onClick={() => editor.chain().focus().unsetColor().run()}
          isActive={!editor.isActive('textStyle', { color: '#CC0000' })}
          title="Black text"
        ><span style={{ color: '#000' }}>A</span></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setColor('#CC0000').run()}
          isActive={editor.isActive('textStyle', { color: '#CC0000' })}
          title="Red text"
        ><span style={{ color: '#CC0000' }}>A</span></ToolbarButton>

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

        <ToolbarButton onClick={() => audioInputRef.current?.click()} title="Insert audio">
          AUD
        </ToolbarButton>
        <input ref={audioInputRef} type="file" accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac"
          onChange={handleAudioUpload} style={{ display: 'none' }} />
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}
