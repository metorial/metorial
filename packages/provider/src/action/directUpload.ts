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

export let uploadAttachmentDirect = async (
  d: SlateDirectUploadInput
): Promise<SlateAttachment> => {
  let baseUrl = d.live.baseUrl.replace(/\/$/, '');

  let registerRes = await fetch(`${baseUrl}/slates-hub/live-invocation/attachments`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${d.live.token}`
    },
    body: JSON.stringify({
      attachments: [{ mimeType: d.mimeType, filename: d.filename }]
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
    ...(d.body instanceof Uint8Array ? {} : ({ duplex: 'half' } as any)),
    headers: d.mimeType ? { 'content-type': d.mimeType } : undefined,
    body: d.body
  });
  if (!putRes.ok) {
    throw new Error(`Failed to upload attachment content (status ${putRes.status})`);
  }

  return {
    mimeType: d.mimeType,
    content: { type: 'upload_reference', referenceId: registration.referenceId }
  };
};
