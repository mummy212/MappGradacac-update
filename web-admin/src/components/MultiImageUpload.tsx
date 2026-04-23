import { useRef, useState, useCallback, DragEvent } from 'react'
import { api } from '../api'
import { Upload, X, ImageIcon, Loader2, Plus, GripVertical } from 'lucide-react'
import { getImgSrc } from '../api'

interface Props {
  value: string[]
  onChange: (urls: string[]) => void
  label?: string
  max?: number
}

export default function MultiImageUpload({ value = [], onChange, label = 'Slike', max = 10 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)

  const upload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Samo slike (JPG, PNG, WebP)'); return }
    if (file.size > 10 * 1024 * 1024) { setError('Max 10 MB po slici'); return }
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
      onChange([...value, res.data.url])
    } catch {
      setError('Greška pri uploadu. Pokušaj ponovo.')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }, [value, onChange])

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    files.forEach(f => upload(f))
  }

  const remove = (idx: number) => {
    const next = [...value]
    next.splice(idx, 1)
    onChange(next)
  }

  const moveFirst = (idx: number) => {
    if (idx === 0) return
    const next = [...value]
    const [item] = next.splice(idx, 1)
    next.unshift(item)
    onChange(next)
  }

  return (
    <div>
      {label && <label className="text-xs font-medium text-slate-600 block mb-1.5">{label}</label>}

      {/* Image thumbnails */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {value.map((url, idx) => (
            <div key={idx} className="relative group w-24 h-24 rounded-xl overflow-hidden bg-slate-100 border-2 border-slate-200">
              <img
                src={getImgSrc(url)}
                alt={`Slika ${idx + 1}`}
                className="w-full h-full object-cover"
                onError={e => { (e.currentTarget as HTMLImageElement).src = '' }}
              />
              {idx === 0 && (
                <span className="absolute top-1 left-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">Naslovna</span>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {idx !== 0 && (
                  <button
                    type="button"
                    onClick={() => moveFirst(idx)}
                    title="Postavi kao naslovnu"
                    className="bg-blue-600 text-white rounded p-1 hover:bg-blue-700"
                  >
                    <GripVertical size={13} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="bg-red-600 text-white rounded p-1 hover:bg-red-700"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {value.length < max && (
        <div
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
            dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'
          } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => {
              Array.from(e.target.files || []).forEach(f => upload(f))
              e.target.value = ''
            }}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={22} className="text-blue-500 animate-spin" />
              <p className="text-sm text-blue-600 font-medium">Upload... {progress}%</p>
              <div className="w-40 bg-slate-200 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
                {dragging ? <Upload size={18} className="text-blue-500" /> : <Plus size={18} className="text-slate-400" />}
              </div>
              <p className="text-sm font-medium text-slate-700">
                {dragging ? 'Pusti ovdje' : 'Dodaj slike'}
              </p>
              <p className="text-xs text-slate-400">JPG, PNG, WebP — max 10 MB • {value.length}/{max}</p>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><X size={12} /> {error}</p>}
    </div>
  )
}
