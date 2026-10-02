'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import AdminPanel from '@/components/AdminPanel'
import { colors, radius, shadow, inputStyle } from '@/lib/theme'
import { REGION_LABELS } from '@/lib/allowed-images'

interface Image {
  id: string
  name: string
  osVersion: string
  osType: string
  osBit: string
  platform: string
  size: number
  status: string
  createdAt: string
  region: string
  edition: string | null
  year: string | null
  hasSQL: boolean
}

type TargetType = 'project' | 'domain' | 'ou_urn'

const TARGET_OPTIONS: { value: TargetType; label: string; placeholder: string }[] = [
  { value: 'project', label: 'Project ID', placeholder: 'ej: 0a87231e6a00...' },
  { value: 'domain', label: 'Account ID (Domain)', placeholder: 'ej: 09f7bd8e6a00...' },
  { value: 'ou_urn', label: 'OU URN', placeholder: 'ej: urn:enterprise:...' },
]

function formatBytes(bytes: number): string {
  if (!bytes) return 'N/A'
  const gb = bytes / (1024 * 1024 * 1024)
  return `${gb.toFixed(2)} GB`
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
      <div
        style={{
          width: 32,
          height: 32,
          border: `3px solid ${colors.border}`,
          borderTopColor: colors.primary,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function RegionBadge({ region }: { region: string }) {
  const label = REGION_LABELS[region] || region
  const isChile = region === 'la-south-2'
  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: 20,
        background: isChile ? '#E8F3FF' : '#FFF3E0',
        color: isChile ? '#0052D9' : '#E65100',
        fontSize: 11,
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

function FullPageSpinner() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.pageBg }}>
      <div
        style={{
          width: 36,
          height: 36,
          border: `3px solid ${colors.border}`,
          borderTopColor: colors.primary,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [images, setImages] = useState<Image[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [targetType, setTargetType] = useState<TargetType>('project')
  const [targetValue, setTargetValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [hoverRow, setHoverRow] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('user')
  const [approvalChecked, setApprovalChecked] = useState(false)
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [filterRegion, setFilterRegion] = useState('')
  const [filterEdition, setFilterEdition] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterSQL, setFilterSQL] = useState<boolean | null>(null)

  useEffect(() => {
    if (message?.type !== 'ok') return
    const timeout = setTimeout(() => setMessage(null), 10000)
    return () => clearTimeout(timeout)
  }, [message])

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || ''
  }, [])

  useEffect(() => {
    async function checkApproval() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        router.push('/auth/login')
        return
      }

      const token = session.session.access_token
      try {
        const res = await fetch('/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        if (res.ok) {
          const data = await res.json()
          if (data.status === 'pending') {
            setApprovalChecked(true)
            setApprovalStatus('pending')
            router.push('/pending')
            return
          }
          if (data.status === 'denied') {
            setApprovalChecked(true)
            setApprovalStatus('denied')
            router.push('/denied')
            return
          }
          setUserRole(data.role || 'user')
          setApprovalStatus('approved')
        }
      } catch (err: any) {
        console.error('Error checking approval:', err.message)
      }
      setApprovalChecked(true)
    }
    checkApproval()
  }, [router])

  useEffect(() => {
    if (!approvalChecked || approvalStatus !== 'approved') return

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
          setMessage({ type: 'err', text: errMsg })
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
  }, [approvalChecked, approvalStatus, getToken])

  useEffect(() => { setFilterEdition(''); setFilterYear(''); setFilterSQL(null) }, [filterRegion])
  useEffect(() => { setFilterYear(''); setFilterSQL(null) }, [filterEdition])
  useEffect(() => { setFilterSQL(null) }, [filterYear])

  const filterOptions = useMemo(() => {
    const regions = new Set<string>()
    images.forEach((img) => regions.add(img.region))

    const regionMatched = images.filter((img) => !filterRegion || img.region === filterRegion)

    const editions = new Set<string>()
    regionMatched.forEach((img) => { if (img.edition) editions.add(img.edition) })

    const editionMatched = regionMatched.filter((img) => !filterEdition || img.edition === filterEdition)

    const years = new Set<string>()
    editionMatched.forEach((img) => { if (img.year) years.add(img.year) })

    const yearMatched = editionMatched.filter((img) => !filterYear || img.year === filterYear)

    const hasSQLImages = yearMatched.some((img) => img.hasSQL)
    const hasNonSQLImages = yearMatched.some((img) => !img.hasSQL)

    return {
      regions: Array.from(regions).sort(),
      editions: Array.from(editions).sort(),
      years: Array.from(years).sort((a, b) => b.localeCompare(a)),
      showSQLToggle: hasSQLImages && hasNonSQLImages,
    }
  }, [images, filterRegion, filterEdition, filterYear])

  const filteredImages = useMemo(() => {
    return images.filter((img) => {
      if (filterRegion && img.region !== filterRegion) return false

      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!img.name.toLowerCase().includes(q) && !img.id.toLowerCase().includes(q)) return false
      }

      if (filterEdition && img.edition !== filterEdition) return false
      if (filterYear && img.year !== filterYear) return false
      if (filterSQL === true && !img.hasSQL) return false
      if (filterSQL === false && img.hasSQL) return false

      return true
    })
  }, [images, searchQuery, filterRegion, filterEdition, filterYear, filterSQL])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === filteredImages.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filteredImages.map((i) => i.id)))
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

    const items = filteredImages
      .filter((img) => selected.has(img.id))
      .map((img) => ({ imageId: img.id, region: img.region }))

    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items,
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

  function clearFilters() {
    setSearchQuery('')
    setFilterRegion('')
    setFilterEdition('')
    setFilterYear('')
    setFilterSQL(null)
  }

  const hasActiveFilters = searchQuery || filterRegion || filterEdition || filterYear || filterSQL !== null
  const visibleSelectionCount = filteredImages.filter((img) => selected.has(img.id)).length
  const selectedPlaceholder = TARGET_OPTIONS.find((o) => o.value === targetType)?.placeholder || ''

  const selectFilterStyle: React.CSSProperties = {
    ...inputStyle,
    boxSizing: 'border-box',
    width: 'auto',
    minWidth: 130,
    appearance: 'none' as any,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%23626B78' stroke-width='1.5'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    paddingRight: 28,
  }

  if (!approvalChecked) {
    return <FullPageSpinner />
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.pageBg }}>
      <Header />
      <main className={`dashboard-main${visibleSelectionCount > 0 ? ' dashboard-main--with-selection' : ''}`} id="main-content">
        <div className="dashboard-heading">
          <div>
            <span className="dashboard-kicker">Image Management Service</span>
            <h1>Imágenes de sistema operativo</h1>
            <p>Explorá y compartí tus imágenes privadas · {filteredImages.length} de {images.length} imagen{images.length !== 1 ? 'es' : ''}</p>
          </div>
          {selected.size > 0 && <span className="selection-count">{selected.size} seleccionada{selected.size !== 1 ? 's' : ''}</span>}
        </div>

        {!loading && images.length > 0 && (
          <div className="filter-panel" aria-label="Filtros de imágenes">
            <div className="search-field">
              <span className="search-icon" aria-hidden="true">⌕</span>
              <input
                aria-label="Buscar imágenes por nombre o ID"
                name="image-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o ID"
                style={inputStyle}
              />
            </div>

            {filterOptions.regions.length > 1 && (
              <select aria-label="Filtrar por región" value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)} style={selectFilterStyle}>
                <option value="">Región: Todas</option>
                {filterOptions.regions.map((r) => (
                  <option key={r} value={r}>{REGION_LABELS[r] || r}</option>
                ))}
              </select>
            )}

            {filterOptions.editions.length > 1 && (
              <select aria-label="Filtrar por edición" value={filterEdition} onChange={(e) => setFilterEdition(e.target.value)} style={selectFilterStyle}>
                <option value="">Edición: Todas</option>
                {filterOptions.editions.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            )}

            {filterOptions.years.length > 1 && (
              <select aria-label="Filtrar por año" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={selectFilterStyle}>
                <option value="">Año: Todos</option>
                {filterOptions.years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            )}

            {filterOptions.showSQLToggle && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: colors.textSecondary, cursor: 'pointer', whiteSpace: 'nowrap', padding: '0 8px' }}>
                <input
                  type="checkbox"
                  checked={filterSQL === true}
                  onChange={() => setFilterSQL(filterSQL === true ? null : true)}
                  style={{ accentColor: colors.primary }}
                />
                Con SQL
              </label>
            )}

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="clear-filters"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {loading && <Spinner />}

        {!loading && images.length === 0 && !message && (
          <div className="empty-state">
            <strong>No hay imágenes privadas disponibles</strong>
            Cuando haya imágenes en tu cuenta de Huawei Cloud, aparecerán acá.
          </div>
        )}

        {!loading && images.length > 0 && filteredImages.length === 0 && (
          <div className="empty-state">
            <strong>No encontramos imágenes con esos filtros</strong>
            Probá otra búsqueda o limpiá los filtros.
          </div>
        )}

        {!loading && filteredImages.length > 0 && (
          <>
            <div className="data-panel" role="region" aria-label="Listado de imágenes" tabIndex={0}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FAFBFC', borderBottom: `1px solid ${colors.border}` }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', width: 40 }}>
                      <input
                        aria-label="Seleccionar todas las imágenes visibles"
                        type="checkbox"
                        checked={selected.size === filteredImages.length && filteredImages.length > 0}
                        onChange={toggleAll}
                        style={{ accentColor: colors.primary }}
                      />
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Región</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Nombre</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>ID</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>SO</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tamaño</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredImages.map((img) => (
                    <tr
                      key={img.id}
                      onMouseEnter={() => setHoverRow(img.id)}
                      onMouseLeave={() => setHoverRow(null)}
                      style={{
                        background: hoverRow === img.id ? colors.hoverRow : (selected.has(img.id) ? colors.primaryLight : colors.cardBg),
                        borderBottom: `1px solid ${colors.borderLight}`,
                        transition: 'background 0.15s',
                      }}
                    >
                      <td style={{ padding: '10px 16px' }}>
                        <input
                          aria-label={`Seleccionar imagen ${img.name}`}
                          type="checkbox"
                          checked={selected.has(img.id)}
                          onChange={() => toggleSelect(img.id)}
                          style={{ accentColor: colors.primary }}
                        />
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <RegionBadge region={img.region} />
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 14, fontWeight: 500, color: colors.textPrimary }}>
                        {img.name}
                        {img.hasSQL && (
                          <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 20, background: '#FFF3E0', color: '#E65100', fontSize: 10, fontWeight: 500 }}>SQL</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12, color: colors.textSecondary }}>
                        <span title={img.id}>{img.id.slice(0, 8)}…</span>
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: colors.textPrimary }}>{img.osVersion || 'N/A'}</td>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: colors.textPrimary }}>{formatBytes(img.size)}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span
                          style={{
                            padding: '2px 10px',
                            borderRadius: 20,
                            background: img.status === 'active' ? colors.successBg : colors.errorBg,
                            color: img.status === 'active' ? '#0E7B00' : colors.error,
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          {img.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <section className="share-panel" aria-labelledby="share-title">
              <h2 id="share-title">Compartir imágenes</h2>
              <p>Seleccioná las imágenes de la tabla y especificá el destino.</p>

              <div className="share-fields">
                <div className="field target-type">
                  <label htmlFor="target-type">Tipo de destino</label>
                  <select
                    id="target-type"
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value as TargetType)}
                  >
                    {TARGET_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="target-value">Identificador de destino</label>
                  <input
                    id="target-value"
                    name="target-value"
                    type="text"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder={selectedPlaceholder}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

                <button
                  onClick={handleShare}
                  disabled={sharing || visibleSelectionCount === 0}
                  className="primary-action"
                >
                  {sharing ? 'Compartiendo…' : 'Compartir imágenes'}
                </button>
              </div>
            </section>
          </>
        )}

        {userRole === 'admin' && <AdminPanel />}
      </main>
      {visibleSelectionCount > 0 && (
        <div className="selection-dock" role="region" aria-label="Imágenes seleccionadas">
          <div className="selection-dock-count">
            <span className="selection-dock-dot" aria-hidden="true" />
            <strong>{visibleSelectionCount}</strong> imagen{visibleSelectionCount !== 1 ? 'es' : ''} seleccionada{visibleSelectionCount !== 1 ? 's' : ''}
          </div>
          <div className="selection-dock-actions">
            <button type="button" className="selection-dock-clear" onClick={() => setSelected(new Set())}>
              Quitar selección
            </button>
            <a className="selection-dock-next" href="#share-title">
              Elegir destino
            </a>
          </div>
        </div>
      )}
      {message && (
        <div
          className={`snackbar snackbar--${message.type}${visibleSelectionCount > 0 ? ' snackbar--above-dock' : ''}`}
          role={message.type === 'err' ? 'alert' : 'status'}
        >
          <span className="snackbar-icon" aria-hidden="true">
            {message.type === 'ok' ? '✓' : '!'}
          </span>
          <span className="snackbar-text">{message.text}</span>
          <button
            type="button"
            className="snackbar-close"
            aria-label="Cerrar aviso"
            onClick={() => setMessage(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
