import { createApiServiceError } from 'slates';
import { httpsUrl, privacy } from './validation';

const limit = 64 * 1024 * 1024;
export async function documentContent(
  url: string,
  secrets: string[],
  maximumBytes = limit
): Promise<{ content: Buffer; mimeType: string }> {
  const source = httpsUrl(url);
  let response: Response;
  try {
    response = await fetch(source, { redirect: 'error', signal: AbortSignal.timeout(30000) });
  } catch {
    throw createApiServiceError(
      'The submission document could not be downloaded safely. Retrieve the exact submission again for its current document link.',
      { parent: {} }
    );
  }
  if (response.status !== 200) {
    await response.body?.cancel();
    throw createApiServiceError(
      'The document download was not accepted. Retrieve the exact submission again; interactive login URLs are unsupported.',
      { upstreamStatus: response.status, parent: {} }
    );
  }
  const declared = response.headers.get('content-length');
  if (declared && /^\d+$/.test(declared) && Number(declared) > maximumBytes) {
    await response.body?.cancel();
    throw createApiServiceError(
      'The document exceeds the 64 MiB download limit. Use its provider link instead.',
      { parent: {} }
    );
  }
  const reader = response.body?.getReader();
  if (!reader)
    throw createApiServiceError('The document download has no content.', { parent: {} });
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > maximumBytes)
        throw createApiServiceError(
          'The document exceeds the 64 MiB download limit. Use its provider link instead.',
          { parent: {} }
        );
      chunks.push(part.value);
    }
    if (!size || (declared && /^\d+$/.test(declared) && Number(declared) !== size))
      throw createApiServiceError(
        'The document download was empty or incomplete. Retrieve the submission again before retrying.',
        { parent: {} }
      );
  } catch {
    await reader.cancel().catch(() => undefined);
    throw createApiServiceError(
      'The document could not be read within the 64 MiB limit. Use its current provider link or retry with a smaller document.',
      { parent: {} }
    );
  } finally {
    reader.releaseLock();
  }
  const bytes = Buffer.concat(chunks);
  if (privacy(bytes.toString('utf8'), secrets) !== bytes.toString('utf8'))
    throw createApiServiceError(
      'The document contains authentication data and cannot be delivered.',
      { parent: {} }
    );
  const nativeMime = response.headers.get('content-type')?.split(';')[0]?.trim();
  if (
    nativeMime &&
    ['text/html', 'application/xhtml+xml'].includes(nativeMime.toLowerCase())
  ) {
    const preview = bytes.subarray(0, 64 * 1024).toString('utf8');
    if (
      /<form\b/i.test(preview) &&
      /<input\b[^>]*\btype\s*=\s*(?:"password"|'password'|password(?:\s|>|\/))/i.test(
        preview
      ) &&
      /\b(?:sign[ -]?in|log[ -]?in)\b/i.test(preview)
    )
      throw createApiServiceError(
        'The document link returned an interactive login page rather than downloadable content. Retrieve the exact submission again for a supported document link.',
        { parent: {} }
      );
  }
  return {
    content: bytes,
    mimeType:
      nativeMime && /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(nativeMime)
        ? nativeMime
        : 'application/octet-stream'
  };
}
export function filename(name: string): string {
  const cleaned = [...name.replace(/[/\\]/g, '_')]
    .filter(c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127)
    .join('')
    .trim();
  return cleaned && cleaned !== '.' && cleaned !== '..' ? cleaned.slice(0, 200) : 'document';
}
