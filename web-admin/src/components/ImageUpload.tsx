import { useRef, useState, useCallback, DragEvent } from 'react'
import { api } from '../api'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'

interface Props {
  value: string
  onChange: (url: string) => void
  label?: string
  aspectHint?: string
}

export default function ImageUpload({ value, onChange, label = 'Slika', aspectHint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)

  const upload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Dozvoljene su samo slike (JPG, PNG, WebP, GIF)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Maksimalna veličina slike je 10 MB')
      return
    }
    setUploading(true)
    setProgress(0)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post('/admin/upload-image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100))
        },
      })
      onChange(res.data.url)
    } catch {
      setError('Greška pri uploadu. Pokušajte ponovo.')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }, [onChange])

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) upload(file)
  }

  const onDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  return (
    <div>
      {label && <label className="text-xs font-medium text-slate-600 block mb-1.5">{label}</label>}
      {aspectHint && <p className="text-xs text-slate-400 mb-2">{aspectHint}</p>}

      {/* Preview */}
      {value && (
        <div className="relative mb-2 rounded-xl overflow-hidden bg-slate-100 group">
          <img
            src={value}
            alt="Preview"
            className="w-full max-h-48 object-cover"
            onError={e => (e.currentTarget.src = '')}
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
            title="Ukloni sliku"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
          dragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'
        } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={24} className="text-blue-500 animate-spin" />
            <p className="text-sm text-blue-600 font-medium">Upload... {progress}%</p>
            <div className="w-48 bg-slate-200 rounded-full h-1.5">
              <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              {dragging ? <Upload size={20} className="text-blue-500" /> : <ImageIcon size={20} className="text-slate-400" />}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">
                {dragging ? 'Pusti ovdje' : 'Povuci sliku ili klikni za odabir'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">JPG, PNG, WebP — max 10 MB</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
          <X size={12} /> {error}
        </p>
      )}

      {/* Manual URL input */}
      <div className="mt-2">
        <input
          className="input text-xs"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="ili unesi URL slike direktno..."
        />
      </div>
    </div>
  )
}
