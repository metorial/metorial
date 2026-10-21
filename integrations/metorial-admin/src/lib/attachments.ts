import type { SlateAddAttachmentInput } from 'slates';
import type { MetorialEndpointResponse } from './client';

export let addResponseAttachment = (
  ctx: { addAttachment: (input: SlateAddAttachmentInput) => Promise<void> },
  response: Extract<MetorialEndpointResponse, { kind: 'text' | 'binary' }>
) =>
  ctx.addAttachment({
    type: 'content',
    content: new Response(
      response.kind === 'text' ? response.text : response.bytes,
      response.contentType ? { headers: { 'Content-Type': response.contentType } } : undefined
    ),
    mimeType: response.contentType
  });
