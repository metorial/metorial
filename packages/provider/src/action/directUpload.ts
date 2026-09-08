import type { SlateAttachment } from './attachment';

export interface SlateLiveInvocationInfo {
  token: string;
  baseUrl: string;
  maxAttachmentSizeBytes: number;
}

export interface SlateDirectUploadInput {
  live: SlateLiveInvocationInfo;
  mimeType?: string;
  filename?: string;
  body: ReadableStream<Uint8Array> | Uint8Array;
}

let bufferAttachmentBody = async (
  body: SlateDirectUploadInput['body'],
  maxSizeBytes: number
) => {
  if (body instanceof Uint8Array) {
    if (body.byteLength > maxSizeBytes) {
      throw new Error(`Attachment exceeds the maximum size of ${maxSizeBytes} bytes`);
    }
    return body;
  }

  let reader = body.getReader();
  let chunks: Uint8Array[] = [];
  let sizeBytes = 0;

  while (true) {
    let { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    sizeBytes += value.byteLength;
    if (sizeBytes > maxSizeBytes) {
      await reader.cancel();
      throw new Error(`Attachment exceeds the maximum size of ${maxSizeBytes} bytes`);
    }
    chunks.push(value);
  }

  let buffered = new Uint8Array(sizeBytes);
  let offset = 0;
  for (let chunk of chunks) {
    buffered.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return buffered;
};

export let uploadAttachmentDirect = async (
  d: SlateDirectUploadInput
): Promise<SlateAttachment> => {
  let baseUrl = d.live.baseUrl.replace(/\/$/, '');
  let body = await bufferAttachmentBody(d.body, d.live.maxAttachmentSizeBytes);

  let registerRes = await fetch(`${baseUrl}/slates-hub/live-invocation/attachments`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${d.live.token}`
    },
    body: JSON.stringify({
      attachments: [
        {
          mimeType: d.mimeType,
          filename: d.filename,
          sizeBytes: body.byteLength || undefined
        }
      ]
    })
  });
  if (!registerRes.ok) {
    throw new Error(
      `Failed to register attachment for direct upload (status ${registerRes.status})`
    );
  }

  let { attachments } = (await registerRes.json()) as {
    attachments: { referenceId: string; uploadUrl: string }[];
  };
  let registration = attachments[0];
  if (!registration) {
    throw new Error('Live invocation API returned no attachment registrations');
  }

  let putRes = await fetch(registration.uploadUrl, {
    method: 'PUT',
    headers: {
      ...(d.mimeType ? { 'content-type': d.mimeType } : {}),
      'content-length': String(body.byteLength)
    },
    body
  });
  if (!putRes.ok) {
    throw new Error(`Failed to upload attachment content (status ${putRes.status})`);
  }

  return {
    mimeType: d.mimeType,
    content: { type: 'upload_reference', referenceId: registration.referenceId }
  };
};
