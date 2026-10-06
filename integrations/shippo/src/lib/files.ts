import { ShippoClient } from './client';
import { type Auth, invalid, objectId, safeData, text } from './helpers';
import type { Resource } from './schemas';

export type DocumentReference = {
  kind: 'transaction' | 'manifest' | 'batch';
  resourceId: string;
  documentType: 'label' | 'commercial_invoice' | 'manifest' | 'batch_labels';
  documentIndex?: number;
};
const MAX_BYTES = 32 * 1024 * 1024;
function fileUrl(value: unknown, auth: Auth): URL {
  const raw = text(value, 'Document URL');
  safeData(raw, auth.token);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw invalid('Shippo returned an invalid document URL.');
  }
  if (
    url.protocol !== 'https:' ||
    !['deliver.goshippo.com', 'shippo-delivery.s3.amazonaws.com'].includes(url.hostname) ||
    url.port ||
    url.username ||
    url.password ||
    url.hash
  )
    throw invalid(
      'Shippo returned an unsupported document host. Contact support with the resource ID.'
    );
  const expires = url.searchParams.get('Expires');
  if (expires !== null && (!/^\d+$/.test(expires) || Number(expires) * 1000 <= Date.now()))
    throw invalid(
      'This Shippo download link has expired. Retrieve the resource again or contact Shippo; automatic link renewal is not guaranteed.'
    );
  return url;
}
export function documentUrl(resource: Resource, reference: DocumentReference): string {
  const index = reference.documentIndex ?? 0;
  if (!Number.isSafeInteger(index) || index < 0)
    throw invalid('documentIndex must be a nonnegative safe integer.');
  if (reference.kind === 'transaction') {
    if (index !== 0 || !['label', 'commercial_invoice'].includes(reference.documentType))
      throw invalid(
        'A transaction supports label or commercial_invoice with documentIndex 0.'
      );
    if (resource.status !== 'SUCCESS')
      throw invalid(
        'The transaction is not successful yet. Inspect get_transaction before downloading.'
      );
    const value =
      reference.documentType === 'label'
        ? resource.label_url
        : resource.commercial_invoice_url;
    if (typeof value !== 'string' || !value)
      throw invalid(
        'This transaction has no requested document. Commercial invoices require an eligible international shipment.'
      );
    return value;
  }
  if (reference.kind === 'manifest') {
    if (reference.documentType !== 'manifest' || resource.status !== 'SUCCESS')
      throw invalid('A successful manifest and documentType manifest are required.');
    const value = resource.documents?.[index];
    if (!value) throw invalid('The requested manifest document index is unavailable.');
    return value;
  }
  if (reference.documentType !== 'batch_labels' || resource.status !== 'PURCHASED')
    throw invalid('A purchased batch and documentType batch_labels are required.');
  const value = Array.isArray(resource.label_url) ? resource.label_url[index] : undefined;
  if (!value) throw invalid('The requested batch document index is unavailable.');
  return value;
}
export async function downloadDocument(
  auth: Auth,
  reference: DocumentReference,
  supplied?: Resource
) {
  objectId(reference.resourceId);
  const index = reference.documentIndex ?? 0;
  if (
    !Number.isSafeInteger(index) ||
    index < 0 ||
    (reference.kind === 'transaction' &&
      (index !== 0 || !['label', 'commercial_invoice'].includes(reference.documentType))) ||
    (reference.kind === 'manifest' && reference.documentType !== 'manifest') ||
    (reference.kind === 'batch' && reference.documentType !== 'batch_labels')
  )
    throw invalid(
      'Choose the document type and index belonging to the selected resource kind.'
    );
  const client = new ShippoClient(auth);
  const resource =
    supplied ??
    (reference.kind === 'transaction'
      ? await client.getTransaction(reference.resourceId)
      : reference.kind === 'manifest'
        ? await client.getManifest(reference.resourceId)
        : await client.getBatch(reference.resourceId));
  if (resource.object_id !== reference.resourceId)
    throw invalid('The document belongs to a different resource.');
  const url = fileUrl(documentUrl(resource, reference), auth);
  let response: Response;
  try {
    response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30_000) });
  } catch {
    throw invalid(
      'The Shippo document could not be downloaded. Retrieve its resource again or contact support.'
    );
  }
  if (!response.ok || !response.body)
    throw invalid(
      'Shippo rejected the document download. The link may have expired; retrieve its resource again.'
    );
  const length = response.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BYTES))
    throw invalid('The document exceeds the 32 MiB download limit.');
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        throw invalid('The document exceeds the 32 MiB download limit.');
      }
      chunks.push(item.value);
    }
  } catch {
    throw invalid('The Shippo document could not be read within the 32 MiB limit.');
  }
  if (!size) throw invalid('Shippo returned an empty document.');
  const bytes = Buffer.concat(chunks),
    format =
      reference.documentType === 'label'
        ? (resource.label_file_type ?? '')
        : reference.kind === 'batch'
          ? (resource.label_filetype ?? '')
          : '';
  let mimeType: string, extension: string;
  if (bytes.subarray(0, 5).toString() === '%PDF-') {
    mimeType = 'application/pdf';
    extension = 'pdf';
  } else if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    mimeType = 'image/png';
    extension = 'png';
  } else if (
    format === 'ZPLII' &&
    bytes.toString('utf8', 0, 64).trimStart().startsWith('^XA')
  ) {
    mimeType = 'application/octet-stream';
    extension = 'zpl';
  } else
    throw invalid(
      'Shippo returned an unsupported or invalid document. Expected PDF, PNG or requested ZPL.'
    );
  const expected = format.startsWith('PDF')
    ? 'application/pdf'
    : format.startsWith('PNG')
      ? 'image/png'
      : format === 'ZPLII'
        ? 'application/octet-stream'
        : undefined;
  if (expected && expected !== mimeType)
    throw invalid('The downloaded document does not match its declared label format.');
  const fileName = `shippo-${reference.resourceId}-${reference.documentType}-${reference.documentIndex ?? 0}.${extension}`;
  return { resourceId: reference.resourceId, fileName, mimeType, size, bytes };
}
export async function addDocument(
  ctx: {
    auth: Auth;
    addAttachment: (input: {
      type: 'content';
      content: Uint8Array;
      filename: string;
      mimeType: string;
    }) => Promise<unknown>;
  },
  resource: Resource,
  reference: DocumentReference,
  write = false
) {
  try {
    const file = await downloadDocument(ctx.auth, reference, resource);
    await ctx.addAttachment({
      type: 'content',
      content: file.bytes,
      filename: file.fileName,
      mimeType: file.mimeType
    });
  } catch {
    const e = invalid(
      'The resource exists, but its document could not be prepared. Use download_document with the exact resource ID; do not repeat a purchase or closeout.'
    );
    e.data.resourceId = reference.resourceId;
    if (write) e.data.writeMayHaveOccurred = true;
    throw e;
  }
}
