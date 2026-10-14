import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

// Resource responses provide one-hour signed PDF URLs; renew five minutes early.
let PREVIEW_REFRESH_AFTER_MS = 55 * 60 * 1000;

export let previewAttachment = (
  url: string,
  reference:
    | { type: 'background'; backgroundId: string }
    | { type: 'letter'; printJobId: string; letterId: string }
) => ({
  type: 'url' as const,
  url,
  mimeType: 'application/pdf',
  refreshReference: reference,
  refreshAt: new Date(Date.now() + PREVIEW_REFRESH_AFTER_MS).toISOString()
});

let referenceSchema = z.object({
  type: z.enum(['background', 'letter']),
  backgroundId: z.string().optional(),
  printJobId: z.string().optional(),
  letterId: z.string().optional()
});

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = referenceSchema.safeParse(ctx.input.reference);
  if (!reference.success) {
    throw createApiServiceError(
      'The preview reference is invalid. Request the preview again.'
    );
  }
  let client = new Client({ token: ctx.auth.token });
  let url: string | null | undefined;
  if (reference.data.type === 'background' && reference.data.backgroundId) {
    let background = await client.getBackground(reference.data.backgroundId);
    url = background.pdf;
  } else if (
    reference.data.type === 'letter' &&
    reference.data.printJobId &&
    reference.data.letterId
  ) {
    let job = await client.getPrintJob(reference.data.printJobId);
    url = job.letters?.find(
      (letter: { id: string }) => letter.id === reference.data.letterId
    )?.pdf;
  } else {
    throw createApiServiceError(
      'The preview reference is incomplete. Request the preview again.'
    );
  }
  if (!url) {
    throw createApiServiceError('The PDF preview is no longer available from Intelliprint.');
  }
  return {
    url,
    expiresAt: new Date(Date.now() + PREVIEW_REFRESH_AFTER_MS).toISOString()
  };
});
