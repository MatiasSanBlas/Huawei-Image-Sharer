import { createHmac, createHash } from 'crypto'

interface SignParams {
  method: string
  url: URL
  headers: Record<string, string>
  body?: string
  ak: string
  sk: string
}

const SIGNED_HEADER_KEYS = [
  'content-type',
  'host',
  'x-project-id',
  'x-sdk-date',
]

function hexEncode(buffer: Buffer): string {
  return buffer.toString('hex')
}

function sha256Hex(data: string): string {
  return createHash('sha256').update(data).digest('hex')
}

function hmacSha256(key: string, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest()
}

function sortQueryString(url: URL): string {
  const params = Array.from(url.searchParams.entries())
  params.sort((a, b) => a[0].localeCompare(b[0]))
  return params.map(([k, v]) => `${k}=${v}`).join('&')
}

function buildCanonicalRequest(
  method: string,
  url: URL,
  signedHeaderKeys: string[],
  headers: Record<string, string>,
  body: string
): string {
  let uri = url.pathname
  if (!uri.endsWith('/')) {
    uri += '/'
  }
  const queryString = sortQueryString(url)

  const canonicalHeaders = signedHeaderKeys
    .map((k) => `${k}:${headers[k] ?? ''}`)
    .join('\n') + '\n'

  const signedHeadersList = signedHeaderKeys.join(';')

  const payloadHash = sha256Hex(body)

  return `${method}\n${uri}\n${queryString}\n${canonicalHeaders}\n${signedHeadersList}\n${payloadHash}`
}

export function signRequest(params: SignParams): Record<string, string> {
  const { method, url, headers, body = '', ak, sk } = params

  const timestamp = headers['x-sdk-date'] || new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')

  const allHeaders: Record<string, string> = {
    ...headers,
    'host': url.host,
    'x-sdk-date': timestamp,
  }

  const signedKeys = SIGNED_HEADER_KEYS
    .filter((k) => allHeaders[k] !== undefined)
    .sort()

  const canonicalRequest = buildCanonicalRequest(
    method,
    url,
    signedKeys,
    allHeaders,
    body
  )

  const stringToSign = `SDK-HMAC-SHA256\n${timestamp}\n${sha256Hex(canonicalRequest)}`

  const signature = hexEncode(hmacSha256(sk, stringToSign))

  const signedHeadersList = signedKeys.join(';')

  allHeaders['authorization'] =
    `SDK-HMAC-SHA256 Access=${ak}, SignedHeaders=${signedHeadersList}, Signature=${signature}`

  return allHeaders
}
