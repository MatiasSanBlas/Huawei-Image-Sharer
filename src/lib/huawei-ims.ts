import { signRequest } from './huawei-signer'
import { ALLOWED_IMAGES } from './allowed-images'

interface RegionConfig {
  region: string
  projectId: string
}

function getCredentials() {
  const ak = process.env.HUAWEI_CLOUD_AK
  const sk = process.env.HUAWEI_CLOUD_SK

  if (!ak || !sk) {
    throw new Error('Missing Huawei Cloud env vars: HUAWEI_CLOUD_AK, HUAWEI_CLOUD_SK')
  }

  return { ak, sk }
}

function getRegions(): RegionConfig[] {
  const regions: RegionConfig[] = []

  const r1 = process.env.HUAWEI_CLOUD_REGION
  const p1 = process.env.HUAWEI_CLOUD_PROJECT_ID
  if (r1 && p1) regions.push({ region: r1, projectId: p1 })

  const r2 = process.env.HUAWEI_CLOUD_REGION_2
  const p2 = process.env.HUAWEI_CLOUD_PROJECT_ID_2
  if (r2 && p2) regions.push({ region: r2, projectId: p2 })

  if (regions.length === 0) {
    throw new Error('Missing Huawei Cloud env vars: at least one region must be configured')
  }

  return regions
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

async function fetchImagesForRegion(
  ak: string,
  sk: string,
  regionConfig: RegionConfig
): Promise<any[]> {
  const baseUrl = buildBaseUrl(regionConfig.region)
  const url = new URL(`${baseUrl}/v2/cloudimages`)
  url.searchParams.set('__imagetype', 'private')
  url.searchParams.set('status', 'active')
  url.searchParams.set('owner', regionConfig.projectId)
  url.searchParams.set('limit', '1000')

  try {
    const res = await signedFetch('GET', url, ak, sk, regionConfig.projectId)

    if (!res.ok) {
      const errBody = await res.text()
      console.error(`IMS list failed for region ${regionConfig.region} (${res.status}): ${errBody}`)
      return []
    }

    const data = await res.json()
    const images = data.images || []

    const allowed = ALLOWED_IMAGES[regionConfig.region]
    const filtered = allowed
      ? images.filter((img: any) => allowed.includes(img.id))
      : images

    return filtered.map((img: any) => ({ ...img, region: regionConfig.region }))
  } catch (err) {
    console.error(`IMS list error for region ${regionConfig.region}:`, err)
    return []
  }
}

export async function listPrivateImages() {
  const { ak, sk } = getCredentials()
  const regions = getRegions()

  const results = await Promise.all(
    regions.map((rc) => fetchImagesForRegion(ak, sk, rc))
  )

  return results.flat()
}

export async function shareImages(
  imageIds: string[],
  targetType: 'project' | 'domain' | 'ou_urn',
  targetValue: string,
  region: string,
  projectId: string
) {
  const { ak, sk } = getCredentials()
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
    throw new Error(`Huawei IMS share failed for region ${region} (${res.status}): ${errBody}`)
  }

  return await res.json()
}

export function getProjectIdForRegion(region: string): string {
  const r1 = process.env.HUAWEI_CLOUD_REGION
  const p1 = process.env.HUAWEI_CLOUD_PROJECT_ID
  if (r1 === region && p1) return p1

  const r2 = process.env.HUAWEI_CLOUD_REGION_2
  const p2 = process.env.HUAWEI_CLOUD_PROJECT_ID_2
  if (r2 === region && p2) return p2

  throw new Error(`No project ID configured for region: ${region}`)
}
