import { signRequest } from './huawei-signer'

function getConfig() {
  const ak = process.env.HUAWEI_CLOUD_AK
  const sk = process.env.HUAWEI_CLOUD_SK
  const projectId = process.env.HUAWEI_CLOUD_PROJECT_ID
  const region = process.env.HUAWEI_CLOUD_REGION

  const missing: string[] = []
  if (!ak) missing.push('HUAWEI_CLOUD_AK')
  if (!sk) missing.push('HUAWEI_CLOUD_SK')
  if (!projectId) missing.push('HUAWEI_CLOUD_PROJECT_ID')
  if (!region) missing.push('HUAWEI_CLOUD_REGION')

  if (missing.length > 0) {
    throw new Error(`Missing Huawei Cloud env vars: ${missing.join(', ')}`)
  }

  return { ak: ak!, sk: sk!, projectId: projectId!, region: region! }
}

function buildBaseUrl(region: string): string {
  return `https://ims.${region}.myhuaweicloud.com`
}

function signedFetch(
  method: string,
  url: URL,
  ak: string,
  sk: string,
  projectId: string,
  body?: string
): Promise<Response> {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')

  const baseHeaders: Record<string, string> = {
    'x-sdk-date': timestamp,
    'x-project-id': projectId,
  }

  if (body) {
    baseHeaders['content-type'] = 'application/json;charset=utf8'
  }

  const signedHeaders = signRequest({
    method,
    url,
    headers: baseHeaders,
    body: body || '',
    ak,
    sk,
  })

  return fetch(url.toString(), {
    method,
    headers: signedHeaders,
    body: body || undefined,
  })
}

export async function listPrivateImages() {
  const { ak, sk, projectId, region } = getConfig()
  const baseUrl = buildBaseUrl(region)

  const url = new URL(`${baseUrl}/v2/cloudimages`)
  url.searchParams.set('__imagetype', 'private')
  url.searchParams.set('status', 'active')
  url.searchParams.set('owner', projectId)
  url.searchParams.set('limit', '1000')

  const res = await signedFetch('GET', url, ak, sk, projectId)

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Huawei IMS list failed (${res.status}): ${errBody}`)
  }

  const data = await res.json()
  return data.images || []
}

export async function shareImages(
  imageIds: string[],
  targetType: 'project' | 'domain' | 'ou_urn',
  targetValue: string
) {
  const { ak, sk, projectId, region } = getConfig()
  const baseUrl = buildBaseUrl(region)

  const url = new URL(`${baseUrl}/v1/cloudimages/members`)

  const body: Record<string, any> = { images: imageIds }

  if (targetType === 'project') {
    body.projects = [targetValue]
  } else if (targetType === 'domain') {
    body.domains = [targetValue]
  } else {
    body.organizations = [targetValue]
  }

  const res = await signedFetch('POST', url, ak, sk, projectId, JSON.stringify(body))

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Huawei IMS share failed (${res.status}): ${errBody}`)
  }

  return await res.json()
}
