'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import Header from '@/components/Header'

interface Image {
  id: string
  name: string
  osVersion: string
  size: number
  status: string
  createdAt: string
}

type TargetType = 'project' | 'domain' | 'ou_urn'

const TARGET_OPTIONS: { value: TargetType; label: string }[] = [
  { value: 'project', label: 'Project ID' },
  { value: 'domain', label: 'Account ID (Domain)' },
  { value: 'ou_urn', label: 'OU URN' },
]

function formatBytes(bytes: number): string {
  if (!bytes) return 'N/A'
  const gb = bytes / (1024 * 1024 * 1024)
  return `${gb.toFixed(2)} GB`
}

export default function DashboardPage() {
  const [images, setImages] = useState<Image[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [targetType, setTargetType] = useState<TargetType>('project')
  const [targetValue, setTargetValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || ''
  }, [])

  useEffect(() => {
    async function fetchImages() {
      const token = await getToken()
      if (!token) {
        setMessage({ type: 'err', text: 'No hay sesion activa' })
        setLoading(false)
        return
      }

      try {
        const res = await fetch('/api/images', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()

        if (!res.ok) {
          const errMsg = data.error || data.message || `Error ${res.status}`
          const detail = data.stack ? `\n\n${data.stack}` : ''
          setMessage({ type: 'err', text: `${errMsg}${detail}` })
          setImages([])
          setLoading(false)
          return
        }

        setImages(data.images || [])
      } catch (err: any) {
        setMessage({ type: 'err', text: err.message || 'Error de conexion con el servidor' })
      } finally {
        setLoading(false)
      }
    }
    fetchImages()
  }, [getToken])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === images.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(images.map((i) => i.id)))
    }
  }

  async function handleShare() {
    if (!targetValue.trim()) {
      setMessage({ type: 'err', text: 'Ingresa el identificador de destino' })
      return
    }
    if (selected.size === 0) {
      setMessage({ type: 'err', text: 'Selecciona al menos una imagen' })
      return
    }

    setSharing(true)
    setMessage(null)
    const token = await getToken()

    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageIds: Array.from(selected),
          targetType,
          targetValue: targetValue.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage({ type: 'err', text: data.error || `Error ${res.status}` })
        setSharing(false)
        return
      }

      const succeeded = data.results?.filter((r: any) => r.success).length || 0
      const failed = data.results?.filter((r: any) => !r.success).length || 0

      if (failed === 0) {
        setMessage({ type: 'ok', text: `${succeeded} imagen(es) compartidas exitosamente` })
        setSelected(new Set())
        setTargetValue('')
      } else {
        setMessage({
          type: 'err',
          text: `${succeeded} exitosas, ${failed} fallidas. Revisa los logs.`,
        })
      }
    } catch (err: any) {
      setMessage({ type: 'err', text: err.message || 'Error de conexion' })
    } finally {
      setSharing(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Header />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        <h1>Imagenes de SO - Cuenta Origen</h1>

        {loading && <p>Cargando imagenes...</p>}

        {!loading && images.length === 0 && !message && (
          <p>No se encontraron imagenes privadas.</p>
        )}

        {message && (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 4,
              background: message.type === 'ok' ? '#d4edda' : '#f8d7da',
              color: message.type === 'ok' ? '#155724' : '#721c24',
              whiteSpace: 'pre-wrap',
              fontSize: 13,
            }}
          >
            {message.text}
          </div>
        )}

        {!loading && images.length > 0 && (
          <>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                background: '#fff',
                borderRadius: 8,
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <thead>
                <tr style={{ background: '#1a1a2e', color: '#fff' }}>
                  <th style={{ padding: 12, textAlign: 'left', width: 40 }}>
                    <input
                      type="checkbox"
                      checked={selected.size === images.length}
                      onChange={toggleAll}
                    />
                  </th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Nombre</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>ID</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>SO</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Tamano</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {images.map((img) => (
                  <tr
                    key={img.id}
                    style={{ borderBottom: '1px solid #eee' }}
                  >
                    <td style={{ padding: 10 }}>
                      <input
                        type="checkbox"
                        checked={selected.has(img.id)}
                        onChange={() => toggleSelect(img.id)}
                      />
                    </td>
                    <td style={{ padding: 10 }}>{img.name}</td>
                    <td style={{ padding: 10, fontFamily: 'monospace', fontSize: 13 }}>
                      {img.id}
                    </td>
                    <td style={{ padding: 10 }}>{img.osVersion || 'N/A'}</td>
                    <td style={{ padding: 10 }}>{formatBytes(img.size)}</td>
                    <td style={{ padding: 10 }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: img.status === 'active' ? '#d4edda' : '#f8d7da',
                          color: img.status === 'active' ? '#155724' : '#721c24',
                          fontSize: 12,
                        }}
                      >
                        {img.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div
              style={{
                marginTop: 24,
                padding: 20,
                background: '#fff',
                borderRadius: 8,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <h3 style={{ marginTop: 0 }}>
                Compartir {selected.size} imagen(es) seleccionada(s)
              </h3>

              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: '0 0 200px' }}>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
                    Tipo de Destino
                  </label>
                  <select
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value as TargetType)}
                    style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                  >
                    {TARGET_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
                    Identificador de Destino
                  </label>
                  <input
                    type="text"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder={
                      targetType === 'project'
                        ? 'ej: 0a87231e6a00...'
                        : targetType === 'domain'
                        ? 'ej: 09f7bd8e6a00...'
                        : 'ej: urn:enterprise:...'
                    }
                    style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                  />
                </div>

                <button
                  onClick={handleShare}
                  disabled={sharing || selected.size === 0}
                  style={{
                    padding: '8px 24px',
                    background: sharing || selected.size === 0 ? '#ccc' : '#0f3460',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    cursor: sharing || selected.size === 0 ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {sharing ? 'Compartiendo...' : 'Compartir Imagenes'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
