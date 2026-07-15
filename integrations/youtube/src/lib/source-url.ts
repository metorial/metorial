import type { LookupAddress } from 'node:dns';
import { lookup } from 'node:dns/promises';
import type { IncomingMessage } from 'node:http';
import { request } from 'node:https';
import { isIP } from 'node:net';
import { youtubeServiceError } from './errors';

const MAX_REDIRECTS = 3;

export type SourceUrlMetadata = {
  contentLength: number;
  entityTag?: string;
  finalUrl: string;
  mimeType: string;
};

let parseIpv4 = (address: string) => {
  let octets = address.split('.').map(value => Number(value));
  if (
    octets.length !== 4 ||
    octets.some(value => !Number.isInteger(value) || value < 0 || value > 255)
  ) {
    return undefined;
  }
  return octets as [number, number, number, number];
};

let isPublicIpv4Address = (address: string) => {
  let octets = parseIpv4(address);
  if (!octets) return false;

  let [first, second, third] = octets;
  if (first === 0 || first === 10 || first === 127 || first >= 224) return false;
  if (first === 100 && second >= 64 && second <= 127) return false;
  if (first === 169 && second === 254) return false;
  if (first === 172 && second >= 16 && second <= 31) return false;
  if (first === 192 && second === 168) return false;
  if (first === 192 && second === 0 && third === 0) return false;
  if (first === 192 && second === 0 && third === 2) return false;
  if (first === 192 && second === 88 && third === 99) return false;
  if (first === 198 && (second === 18 || second === 19)) return false;
  if (first === 198 && second === 51 && third === 100) return false;
  if (first === 203 && second === 0 && third === 113) return false;
  return true;
};

let parseIpv6Groups = (address: string) => {
  let text = address.toLowerCase();
  let sections = text.split('::');
  if (sections.length > 2) return undefined;

  let expandSection = (section: string) => {
    if (section === '') return [] as number[];
    let groups: number[] = [];
    for (let piece of section.split(':')) {
      if (piece.includes('.')) {
        // Embedded IPv4 tail (e.g. ::ffff:10.0.0.1) occupies two 16-bit groups.
        let octets = parseIpv4(piece);
        if (!octets) return undefined;
        groups.push((octets[0] << 8) | octets[1], (octets[2] << 8) | octets[3]);
        continue;
      }
      if (!/^[0-9a-f]{1,4}$/.test(piece)) return undefined;
      groups.push(Number.parseInt(piece, 16));
    }
    return groups;
  };

  let head = expandSection(sections[0]!);
  if (!head) return undefined;
  if (sections.length === 1) {
    return head.length === 8 ? head : undefined;
  }

  let tail = expandSection(sections[1]!);
  if (!tail || head.length + tail.length > 7) return undefined;
  return [...head, ...Array<number>(8 - head.length - tail.length).fill(0), ...tail];
};

export let isPublicIpAddress = (address: string) => {
  let family = isIP(address);
  if (family === 4) return isPublicIpv4Address(address);
  if (family !== 6) return false;

  let groups = parseIpv6Groups(address);
  if (!groups) return false;

  // Reject IPv4-embedding transition and documentation prefixes explicitly:
  // 6to4 (2002::/16), Teredo (2001::/32), documentation (2001:db8::/32), and
  // the NAT64 well-known prefix (64:ff9b::/96). Each of these can smuggle a
  // private IPv4 target inside an otherwise routable IPv6 address.
  if (groups[0] === 0x2002) return false;
  if (groups[0] === 0x2001 && (groups[1] === 0x0000 || groups[1] === 0x0db8)) return false;
  if (
    groups[0] === 0x0064 &&
    groups[1] === 0xff9b &&
    groups[2] === 0 &&
    groups[3] === 0 &&
    groups[4] === 0 &&
    groups[5] === 0
  ) {
    return false;
  }

  // Public IPv6 unicast currently occupies 2000::/3. Keep the source fetcher
  // deliberately conservative.
  return (groups[0]! & 0xe000) === 0x2000;
};

export let validateSourceUrl = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw youtubeServiceError('sourceUrl must be a valid HTTPS URL.');
  }

  if (url.protocol !== 'https:') {
    throw youtubeServiceError('sourceUrl must use HTTPS.');
  }
  if (url.username || url.password) {
    throw youtubeServiceError('sourceUrl must not contain embedded credentials.');
  }
  url.hash = '';

  let hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (
    !hostname.includes('.') ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.home.arpa')
  ) {
    throw youtubeServiceError('sourceUrl must use a public internet hostname.');
  }
  if (isIP(hostname) && !isPublicIpAddress(hostname)) {
    throw youtubeServiceError('sourceUrl must not resolve to a private or reserved address.');
  }

  return url;
};

let resolvePublicAddress = async (url: URL): Promise<LookupAddress> => {
  let addresses: LookupAddress[];
  try {
    addresses = await lookup(url.hostname, { all: true, verbatim: true });
  } catch {
    throw youtubeServiceError('sourceUrl hostname could not be resolved.');
  }

  if (addresses.length === 0 || addresses.some(item => !isPublicIpAddress(item.address))) {
    throw youtubeServiceError('sourceUrl must resolve only to public internet addresses.');
  }
  return addresses[0]!;
};

let openPublicHttps = async (
  value: string,
  headers: Record<string, string>,
  redirectCount = 0
): Promise<{ response: IncomingMessage; finalUrl: string }> => {
  let url = validateSourceUrl(value);
  let resolved = await resolvePublicAddress(url);

  let response = await new Promise<IncomingMessage>((resolve, reject) => {
    let req = request(
      url,
      {
        headers: {
          'Accept-Encoding': 'identity',
          ...headers
        },
        lookup: (_hostname, _options, callback) => {
          callback(null, resolved.address, resolved.family);
        }
      },
      resolve
    );
    req.on('error', reject);
    req.setTimeout(30_000, () => {
      req.destroy();
      reject(youtubeServiceError('sourceUrl request timed out.'));
    });
    req.end();
  }).catch(error => {
    throw youtubeServiceError(
      `Unable to fetch sourceUrl: ${error instanceof Error ? error.message : 'request failed'}`
    );
  });

  let status = response.statusCode ?? 0;
  if (status >= 300 && status < 400) {
    let location = response.headers.location;
    response.destroy();
    if (!location) {
      throw youtubeServiceError('sourceUrl redirect did not include a Location header.');
    }
    if (redirectCount >= MAX_REDIRECTS) {
      throw youtubeServiceError(`sourceUrl exceeded the ${MAX_REDIRECTS}-redirect limit.`);
    }
    let redirectUrl: string;
    try {
      redirectUrl = new URL(location, url).toString();
    } catch {
      throw youtubeServiceError('sourceUrl redirect Location was not a valid URL.');
    }
    return await openPublicHttps(redirectUrl, headers, redirectCount + 1);
  }

  if (status !== 200 && status !== 206) {
    response.destroy();
    throw youtubeServiceError(`sourceUrl returned HTTP ${status || 'unknown'}.`);
  }

  let contentEncoding = response.headers['content-encoding'];
  if (
    contentEncoding !== undefined &&
    String(
      Array.isArray(contentEncoding) ? contentEncoding[0] : contentEncoding
    ).toLowerCase() !== 'identity'
  ) {
    response.destroy();
    throw youtubeServiceError('sourceUrl must return an uncompressed byte representation.');
  }

  return { response, finalUrl: url.toString() };
};

let parseContentRange = (value: string | string[] | undefined) => {
  let text = Array.isArray(value) ? value[0] : value;
  let match = text?.match(/^bytes (\d+)-(\d+)\/(\d+)$/i);
  if (!match) return undefined;
  let range = {
    start: Number(match[1]),
    end: Number(match[2]),
    total: Number(match[3])
  };
  if (
    !Number.isSafeInteger(range.start) ||
    !Number.isSafeInteger(range.end) ||
    !Number.isSafeInteger(range.total) ||
    range.start < 0 ||
    range.end < range.start ||
    range.end >= range.total
  ) {
    return undefined;
  }
  return range;
};

export let probeSourceUrl = async (sourceUrl: string): Promise<SourceUrlMetadata> => {
  let { response, finalUrl } = await openPublicHttps(sourceUrl, {
    Accept: 'video/*,application/octet-stream',
    Range: 'bytes=0-0'
  });
  let contentRange = parseContentRange(response.headers['content-range']);
  let contentLength = contentRange?.total;
  let mimeType = String(response.headers['content-type'] ?? 'application/octet-stream')
    .split(';')[0]!
    .trim()
    .toLowerCase();
  let rawEntityTag = response.headers.etag;
  let entityTag = Array.isArray(rawEntityTag) ? rawEntityTag[0] : rawEntityTag;
  if (entityTag?.startsWith('W/')) entityTag = undefined;
  response.destroy();

  if (
    response.statusCode !== 206 ||
    !contentRange ||
    contentRange.start !== 0 ||
    contentRange.end !== 0 ||
    !contentLength
  ) {
    throw youtubeServiceError(
      'sourceUrl must support HTTP byte ranges and return a valid Content-Range total.'
    );
  }
  if (mimeType !== 'application/octet-stream' && !mimeType.startsWith('video/')) {
    throw youtubeServiceError(
      'sourceUrl must return a video/* or application/octet-stream content type.'
    );
  }

  return { contentLength, entityTag, finalUrl, mimeType };
};

export let readSourceUrlChunk = async (
  source: SourceUrlMetadata,
  start: number,
  end: number
) => {
  let { response } = await openPublicHttps(source.finalUrl, {
    Accept: 'video/*,application/octet-stream',
    Range: `bytes=${start}-${end}`,
    ...(source.entityTag ? { 'If-Match': source.entityTag } : {})
  });
  let contentRange = parseContentRange(response.headers['content-range']);
  let mimeType = String(response.headers['content-type'] ?? 'application/octet-stream')
    .split(';')[0]!
    .trim()
    .toLowerCase();
  if (
    response.statusCode !== 206 ||
    !contentRange ||
    contentRange.start !== start ||
    contentRange.end !== end ||
    contentRange.total !== source.contentLength ||
    mimeType !== source.mimeType
  ) {
    response.destroy();
    throw youtubeServiceError(
      'sourceUrl returned inconsistent range, length, or media-type metadata.'
    );
  }

  let desiredLength = end - start + 1;
  let absoluteOffset = start;
  let chunks: Buffer[] = [];
  let collected = 0;

  try {
    for await (let rawChunk of response) {
      let chunk = Buffer.isBuffer(rawChunk) ? rawChunk : Buffer.from(rawChunk);
      let chunkStart = absoluteOffset;
      let chunkEnd = absoluteOffset + chunk.length;
      let overlapStart = Math.max(start, chunkStart);
      let overlapEnd = Math.min(end + 1, chunkEnd);
      if (overlapStart < overlapEnd) {
        let selected = chunk.subarray(overlapStart - chunkStart, overlapEnd - chunkStart);
        chunks.push(selected);
        collected += selected.length;
      }
      absoluteOffset = chunkEnd;
      if (collected >= desiredLength) {
        response.destroy();
        break;
      }
    }
  } catch (error) {
    throw youtubeServiceError(
      `Unable to read sourceUrl content: ${error instanceof Error ? error.message : 'stream failed'}`
    );
  }

  let result = Buffer.concat(chunks, collected);
  if (result.length !== desiredLength) {
    throw youtubeServiceError(
      `sourceUrl ended after ${result.length} bytes; expected ${desiredLength} bytes.`
    );
  }
  return result;
};
