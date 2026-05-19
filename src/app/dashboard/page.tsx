'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase-client'
import Header from '@/components/Header'
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

export default function DashboardPage() {
  const [images, setImages] = useState<Image[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [targetType, setTargetType] = useState<TargetType>('project')
  const [targetValue, setTargetValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [hoverRow, setHoverRow] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [filterRegion, setFilterRegion] = useState('')
  const [filterEdition, setFilterEdition] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterSQL, setFilterSQL] = useState<boolean | null>(null)

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
  }, [getToken])

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
  const selectedPlaceholder = TARGET_OPTIONS.find((o) => o.value === targetType)?.placeholder || ''

  const selectFilterStyle: React.CSSProperties = {
    ...inputStyle,
    boxSizing: 'border-box',
    minWidth: 130,
    appearance: 'none' as any,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%2386909C' stroke-width='1.5'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    paddingRight: 28,
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.pageBg }}>
      <Header />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 600, color: colors.textPrimary }}>
              Imagenes de SO
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: colors.textSecondary }}>
              {filteredImages.length} de {images.length} imagen{images.length !== 1 ? 'es' : ''}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {selected.size > 0 && (
              <span style={{
                padding: '4px 12px',
                background: colors.primaryLight,
                color: colors.primary,
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 500,
              }}>
                {selected.size} seleccionada{selected.size !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {message && (
          <div
            style={{
              marginBottom: 16,
              padding: '12px 16px',
              borderRadius: radius.md,
              background: message.type === 'ok' ? colors.successBg : colors.errorBg,
              color: message.type === 'ok' ? '#0E7B00' : colors.error,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>{message.type === 'ok' ? '\u2713' : '\u2717'}</span>
            {message.text}
          </div>
        )}

        {!loading && images.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: colors.textSecondary, fontSize: 14, pointerEvents: 'none' }}>
                {'\u2315'}
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o ID..."
                style={{ ...inputStyle, boxSizing: 'border-box', paddingLeft: 32 }}
              />
            </div>

            {filterOptions.regions.length > 1 && (
              <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)} style={selectFilterStyle}>
                <option value="">Región: Todas</option>
                {filterOptions.regions.map((r) => (
                  <option key={r} value={r}>{REGION_LABELS[r] || r}</option>
                ))}
              </select>
            )}

            {filterOptions.editions.length > 1 && (
              <select value={filterEdition} onChange={(e) => setFilterEdition(e.target.value)} style={selectFilterStyle}>
                <option value="">Edición: Todas</option>
                {filterOptions.editions.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            )}

            {filterOptions.years.length > 1 && (
              <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={selectFilterStyle}>
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
                style={{
                  padding: '8px 12px',
                  background: 'transparent',
                  color: colors.textSecondary,
                  border: 'none',
                  borderRadius: radius.sm,
                  cursor: 'pointer',
                  fontSize: 13,
                  textDecoration: 'underline',
                }}
              >
                Limpiar
              </button>
            )}
          </div>
        )}

        {loading && <Spinner />}

        {!loading && images.length === 0 && !message && (
          <div style={{ textAlign: 'center', padding: 48, color: colors.textSecondary, fontSize: 14 }}>
            No se encontraron imagenes privadas.
          </div>
        )}

        {!loading && images.length > 0 && filteredImages.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: colors.textSecondary, fontSize: 14 }}>
            No hay imagenes que coincidan con los filtros.
          </div>
        )}

        {!loading && filteredImages.length > 0 && (
          <>
            <div style={{ background: colors.cardBg, borderRadius: radius.md, boxShadow: shadow.card, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FAFBFC', borderBottom: `1px solid ${colors.border}` }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', width: 40 }}>
                      <input
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
                        {img.id.slice(0, 8)}...
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

            <div
              style={{
                marginTop: 20,
                padding: 24,
                background: colors.cardBg,
                borderRadius: radius.md,
                boxShadow: shadow.card,
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 15, fontWeight: 600, color: colors.textPrimary }}>
                Compartir imagenes
              </h3>

              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: '0 0 200px' }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: colors.textSecondary }}>
                    Tipo de destino
                  </label>
                  <select
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value as TargetType)}
                    style={{ ...inputStyle, boxSizing: 'border-box' }}
                  >
                    {TARGET_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1, minWidth: 240 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: colors.textSecondary }}>
                    Identificador de destino
                  </label>
                  <input
                    type="text"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder={selectedPlaceholder}
                    style={{ ...inputStyle, boxSizing: 'border-box' }}
                  />
                </div>

                <button
                  onClick={handleShare}
                  disabled={sharing || selected.size === 0}
                  style={{
                    padding: '10px 28px',
                    background: sharing || selected.size === 0 ? colors.disabledBg : colors.primary,
                    color: sharing || selected.size === 0 ? colors.disabled : colors.textWhite,
                    border: 'none',
                    borderRadius: radius.sm,
                    cursor: sharing || selected.size === 0 ? 'not-allowed' : 'pointer',
                    fontWeight: 500,
                    fontSize: 14,
                    whiteSpace: 'nowrap',
                    transition: 'background 0.2s',
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
