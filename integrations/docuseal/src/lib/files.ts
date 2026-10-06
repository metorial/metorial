import { Buffer } from 'node:buffer';
import type { SlateAddAttachmentInput } from 'slates';
import type { z } from 'zod';
import type { documentSchema } from './schemas';
import { apiError, fail, fileUrl, privacy } from './validation';

type Context = { addAttachment(input: SlateAddAttachmentInput): Promise<void> };
const MAX_BYTES = 64 * 1024 * 1024;

export async function deliverDocuments(
  ctx: Context,
  documents: z.infer<typeof documentSchema>[],
  token: string
) {
  if (!documents.length) fail('No documents are available for this submission yet.');
  const prepared: Array<{ name: string; bytes: Buffer }> = [];
  let total = 0;
  for (const [index, document] of documents.entries()) {
    const url = fileUrl(document.url);
    let response: Response;
    try {
      response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000) });
    } catch (error) {
      apiError(error);
    }
    if (response.status !== 200 || !response.body) {
      await response.body?.cancel();
      fail(
        'The document could not be downloaded. Request the documents again to renew their download links.'
      );
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        total += chunk.value.byteLength;
        if (total > MAX_BYTES) {
          await reader.cancel();
          fail(
            'The requested documents exceed the 64 MiB download limit. Download fewer documents directly in DocuSeal.'
          );
        }
        chunks.push(chunk.value);
      }
    } catch (error) {
      apiError(error);
    }
    const bytes = Buffer.concat(chunks);
    if (!bytes.length || !bytes.subarray(0, 1024).includes(Buffer.from('%PDF-')))
      fail('DocuSeal did not return a PDF document. Request the documents again.');
    privacy(bytes.toString('utf8'), token);
    const name = (document.name ?? document.filename ?? `document-${index + 1}.pdf`)
      .replace(/[/\\]/g, '-')
      .replace(/[\r\n]/g, ' ');
    prepared.push({ name, bytes });
  }
  // Native URL expiry is account-configured and absent from this endpoint's metadata.
  // Bounded content delivery avoids assigning an invented renewal time.
  for (const document of prepared)
    await ctx.addAttachment({
      type: 'content',
      filename: document.name,
      mimeType: 'application/pdf',
      content: document.bytes
    });
  return prepared.map(document => ({
    name: document.name,
    size: document.bytes.length,
    mimeType: 'application/pdf'
  }));
}
