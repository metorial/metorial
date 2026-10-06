import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import { z } from 'zod';

export { z };

const ROOT = 'https://www.loom.com';
export const MAX_TEXT_BYTES = 1024 * 1024;
export const MAX_RESULT_BYTES = 2 * 1024 * 1024;
const MAX_NATIVE_BYTES = 256 * 1024;
const hosts = new Set(['loom.com', 'www.loom.com']);
export const invalid = (message: string) =>
  createApiServiceError(message, { reason: 'loom_validation' });
export const upstream = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Loom',
    reason: 'loom_oembed',
    parent: {},
    extractMessage: () => '',
    formatMessage: ({ status }) =>
      `Loom oEmbed failed${typeof status === 'number' ? ` (HTTP ${status})` : ''}. ${status === 401 || status === 403 ? 'Use an authorized public/shareable video; this anonymous integration cannot bypass video privacy.' : status === 404 ? 'Check the exact share URL; missing content does not establish deletion or ownership.' : status === 429 ? 'Wait before a deliberate retry.' : 'Retry deliberately after checking video availability; no recording or permission was changed.'}`
  });
export function dimension(value: number | undefined, label: string): number | undefined {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < 1))
    throw invalid(`${label} must be a positive safe integer in pixels.`);
  return value;
}
export function parseLoomUrl(input: string) {
  if (typeof input !== 'string' || input.length > 4096 || input !== input.trim())
    throw invalid('Use a complete Loom share or embed URL without surrounding text.');
  for (const c of input)
    if (c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
      throw invalid('The Loom URL contains unsupported control characters.');
  // Check the original URL before WHATWG normalization can collapse paths or ports.
  if (
    !/^https?:\/\/(?:www\.)?loom\.com\/(?:share|embed)\/[A-Za-z0-9]{1,128}\/?(?:[?#].*)?$/i.test(
      input
    )
  )
    throw invalid(
      'Use a complete credential-free Loom share/embed URL without extra paths, ports or backslashes.'
    );
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw invalid('Use a complete HTTPS Loom share or embed URL.');
  }
  const match = /^\/(share|embed)\/([A-Za-z0-9]{1,128})\/?$/.exec(url.pathname);
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    !hosts.has(url.hostname) ||
    url.port ||
    url.username ||
    url.password ||
    !match
  )
    throw invalid(
      'Use a credential-free loom.com or www.loom.com share/embed URL with the exact video ID. Other hosts and extra resource paths are unsupported.'
    );
  if (
    [...url.searchParams.keys()].some(k =>
      /token|secret|password|authorization|api[_-]?key/i.test(k)
    )
  )
    throw invalid(
      'Do not include credentials in a Loom URL. This integration only reads anonymous oEmbed metadata.'
    );
  return {
    videoId: match[2]!,
    kind: match[1]!,
    shareUrl: `${ROOT}/share/${match[2]}`,
    embedUrl: `${ROOT}/embed/${match[2]}`
  };
}
export const extractVideoId = (url: string): string | null => {
  try {
    return parseLoomUrl(url).videoId;
  } catch {
    return null;
  }
};
export const isValidLoomUrl = (url: string): boolean => extractVideoId(url) !== null;
export const normalizeToShareUrl = (url: string): string => parseLoomUrl(url).shareUrl;
const count = z.number().finite().nonnegative(),
  pixels = z.number().int().nonnegative().safe();
const nativeSchema = z
  .object({
    type: z.literal('video'),
    version: z.union([z.string(), z.number().finite()]).optional(),
    title: z.string().max(MAX_NATIVE_BYTES),
    html: z.string().min(1).max(MAX_NATIVE_BYTES),
    width: pixels.nullable(),
    height: pixels.nullable(),
    provider_name: z.literal('Loom'),
    provider_url: z.string(),
    thumbnail_url: z.string(),
    thumbnail_width: pixels,
    thumbnail_height: pixels,
    duration: count
  })
  .passthrough();
export function nativeEmbedHtml(html: string, videoId: string): void {
  // Verify the native iframe's resource binding; this is not a general HTML sanitizer.
  if (
    /<\s*(?:script|object|embed|link|meta|base|style)\b/i.test(html) ||
    /\son[a-z]+\s*=/i.test(html) ||
    /(?:javascript\s*:|url\s*\()/i.test(html)
  )
    throw invalid(
      'Loom returned unsupported active embed content. Request fresh metadata rather than rendering it.'
    );
  const markup = html.replace(/<!--[\s\S]*?(?:-->|$)/g, '');
  const frames = [...markup.matchAll(/<iframe\b[^>]*>/gi)];
  const attributes = [
    ...(frames[0]?.[0] ?? '').matchAll(
      /\s+([^\s=/>]+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'`=<>]+))?/g
    )
  ];
  const sources = [
    ...(frames[0]?.[0] ?? '').matchAll(/\s+src\s*=\s*(?:"([^"]+)"|'([^']+)')/gi)
  ];
  if (
    frames.length !== 1 ||
    sources.length !== 1 ||
    attributes.filter(attribute => attribute[1]?.toLowerCase() === 'src').length !== 1 ||
    !/<\/iframe\s*>/i.test(markup) ||
    /\ssrcdoc\s*=/i.test(html)
  )
    throw invalid('Loom did not return one identifiable native video iframe.');
  const src = (sources[0]?.[1] ?? sources[0]?.[2] ?? '').replace(/&amp;/gi, '&');
  const actual = parseLoomUrl(src);
  if (actual.kind !== 'embed' || actual.videoId !== videoId || !src.startsWith('https://'))
    throw invalid(
      'Loom returned an embed for a different video or an unsupported iframe destination.'
    );
}
function publicHttps(value: string, label: string): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw invalid(`Loom returned an invalid ${label} URL.`);
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash)
    throw invalid(`Loom returned an unsupported ${label} URL.`);
}
export interface OEmbedOptions {
  maxWidth?: number;
  maxHeight?: number;
}
export async function fetchOEmbed(loomUrl: string, options: OEmbedOptions = {}) {
  const resource = parseLoomUrl(loomUrl);
  const params = pickDefined({
    url: resource.shareUrl,
    maxwidth: dimension(options.maxWidth, 'maxWidth'),
    maxheight: dimension(options.maxHeight, 'maxHeight')
  });
  const http = createAuthenticatedAxios({
    baseURL: ROOT,
    contentType: false,
    timeout: 30_000,
    maxRedirects: 0,
    maxContentLength: MAX_NATIVE_BYTES,
    maxBodyLength: MAX_NATIVE_BYTES,
    errorAdapter: upstream
  });
  try {
    const response = await http.get('/v1/oembed', { params });
    if (response.status !== 200)
      throw invalid(
        'Loom returned an unsupported oEmbed success status. Request fresh metadata; no playback or video state is confirmed.'
      );
    const parsed = nativeSchema.safeParse(response.data);
    if (!parsed.success)
      throw invalid(
        'Loom returned incomplete or unsupported oEmbed metadata. Check video visibility; no replacement is confirmed.'
      );
    const data = parsed.data;
    if (Buffer.byteLength(JSON.stringify(data)) > MAX_NATIVE_BYTES)
      throw invalid('Loom metadata exceeds the local 256 KiB response bound.');
    nativeEmbedHtml(data.html, resource.videoId);
    publicHttps(data.thumbnail_url, 'thumbnail');
    publicHttps(data.provider_url, 'provider');
    if (!hosts.has(new URL(data.provider_url).hostname))
      throw invalid('Loom returned a different native provider identity.');
    return {
      type: data.type,
      version: data.version,
      title: data.title,
      html: data.html,
      width: data.width,
      height: data.height,
      providerName: data.provider_name,
      providerUrl: data.provider_url,
      thumbnailUrl: data.thumbnail_url,
      thumbnailWidth: data.thumbnail_width,
      thumbnailHeight: data.thumbnail_height,
      duration: data.duration
    };
  } catch (error) {
    throw upstream(error);
  }
}
export type OEmbedResponse = Awaited<ReturnType<typeof fetchOEmbed>>;
type EmbedOptions = { hideTopBar?: boolean; autoplay?: boolean; startTime?: string };
function startTime(value?: string) {
  if (
    value !== undefined &&
    (value.length > 32 || !/^(?:[0-9]+|[0-9]+s|[0-9]+m(?:[0-9]+s)?)$/.test(value))
  )
    throw invalid(
      'startTime must use documented nonnegative seconds or minutes/seconds, such as 20, 20s or 1m30s.'
    );
  return value;
}
export function buildEmbedUrl(videoId: string, options: EmbedOptions = {}) {
  const resource = parseLoomUrl(`${ROOT}/embed/${videoId}`);
  const url = new URL(resource.embedUrl);
  if (options.hideTopBar) url.searchParams.set('hideEmbedTopBar', 'true');
  if (options.autoplay) url.searchParams.set('autoplay', '1');
  if (options.startTime !== undefined)
    url.searchParams.set('t', startTime(options.startTime)!);
  return url.href;
}
const htmlAttribute = (value: string) =>
  value.replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );
export function buildEmbedIframe(
  videoId: string,
  options: EmbedOptions & { width?: number; height?: number } = {}
) {
  const embedUrl = htmlAttribute(buildEmbedUrl(videoId, options)),
    width = dimension(options.width, 'width'),
    height = dimension(options.height, 'height');
  if (width === undefined && height === undefined)
    return `<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;"><iframe src="${embedUrl}" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>`;
  return `<iframe src="${embedUrl}"${width === undefined ? '' : ` width="${width}"`}${height === undefined ? '' : ` height="${height}"`} frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>`;
}
export function assertText(text: string) {
  if (Buffer.byteLength(text) > MAX_TEXT_BYTES)
    throw invalid('Text exceeds the local 1 MiB processing bound.');
}
export function findLoomUrlMatches(text: string) {
  assertText(text);
  const found: { url: string; index: number }[] = [];
  for (const match of text.matchAll(/https?:\/\/[^\s<>"'`]+/gi)) {
    const candidate = match[0].replace(/[)\]},.!?;:]+$/, '');
    if (isValidLoomUrl(candidate)) found.push({ url: candidate, index: match.index! });
  }
  if (new Set(found.map(v => v.url)).size > 20)
    throw invalid(
      'Text contains more than the local 20 unique Loom-URL bound. Split the request before fetching metadata.'
    );
  return found;
}
export const findLoomUrls = (text: string) => findLoomUrlMatches(text).map(v => v.url);
