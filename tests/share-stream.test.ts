import { describe, expect, it } from 'vitest'
import { readShareStream, type ShareStreamEvent } from '../src/lib/share-stream'

function responseFromChunks(chunks: Uint8Array[]) {
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk)
      controller.close()
    },
  }))
}

describe('share progress stream', () => {
  it('reads progress when JSON lines are split across network chunks', async () => {
    const encoder = new TextEncoder()
    const payload = [
      { type: 'start', total: 2 },
      { type: 'region', region: 'la-south-2' },
      { type: 'progress', region: 'la-south-2', total: 2, completed: 1, succeeded: 1, failed: 0 },
      { type: 'complete', results: [{ imageId: 'one', success: true }, { imageId: 'two', success: false, error: 'Falló' }] },
    ].map((event) => JSON.stringify(event)).join('\n') + '\n'
    const bytes = encoder.encode(payload)
    const events: ShareStreamEvent[] = []

    const results = await readShareStream(
      responseFromChunks([bytes.slice(0, 13), bytes.slice(13, 109), bytes.slice(109)]),
      (event) => events.push(event)
    )

    expect(events.map((event) => event.type)).toEqual(['start', 'region', 'progress', 'complete'])
    expect(results).toEqual([
      { imageId: 'one', success: true },
      { imageId: 'two', success: false, error: 'Falló' },
    ])
  })

  it('does not report completion when the connection ends early', async () => {
    const payload = new TextEncoder().encode('{"type":"progress","region":"la-south-2","total":2,"completed":1,"succeeded":1,"failed":0}\n')
    await expect(readShareStream(responseFromChunks([payload]), () => {}))
      .rejects.toThrow('se interrumpió')
  })

  it('surfaces a server error event', async () => {
    const payload = new TextEncoder().encode('{"type":"error","error":"No se pudo enviar"}\n')
    await expect(readShareStream(responseFromChunks([payload]), () => {}))
      .rejects.toThrow('No se pudo enviar')
  })
})
