export interface ShareResult {
  imageId: string
  success: boolean
  error?: string
}

export type ShareStreamEvent =
  | { type: 'start'; total: number }
  | { type: 'region'; region: string }
  | { type: 'progress'; region: string; total: number; completed: number; succeeded: number; failed: number }
  | { type: 'complete'; results: ShareResult[] }
  | { type: 'error'; error: string }

export async function readShareStream(
  response: Response,
  onEvent: (event: ShareStreamEvent) => void
): Promise<ShareResult[]> {
  if (!response.body) throw new Error('No se recibió el progreso del envío')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let results: ShareResult[] | null = null

  function readLine(line: string) {
    if (!line.trim()) return

    let event: ShareStreamEvent
    try {
      event = JSON.parse(line)
    } catch {
      throw new Error('El servidor devolvió progreso inválido')
    }

    if (event.type === 'error') throw new Error(event.error || 'Error al compartir imágenes')
    onEvent(event)
    if (event.type === 'complete') results = event.results
  }

  function readBufferedLines() {
    let newline = buffer.indexOf('\n')
    while (newline !== -1) {
      readLine(buffer.slice(0, newline))
      buffer = buffer.slice(newline + 1)
      newline = buffer.indexOf('\n')
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      readBufferedLines()
    }

    buffer += decoder.decode()
    readBufferedLines()
    readLine(buffer)
  } finally {
    reader.releaseLock()
  }

  if (!results) throw new Error('El envío se interrumpió antes de confirmar el resultado')
  return results
}
