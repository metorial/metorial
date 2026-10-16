import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let referenceSchema = z.object({
  kind: z.enum(['attachment', 'raw']),
  inboxId: z.string().min(1),
  messageId: z.string().min(1).optional(),
  threadId: z.string().min(1).optional(),
  attachmentId: z.string().min(1).optional()
});

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let parsed = referenceSchema.safeParse(ctx.input.reference);
  if (!parsed.success)
    throw createApiServiceError('The download reference is invalid. Request the file again.');
  let reference = parsed.data;
  let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });
  if (reference.kind === 'raw' && reference.messageId) {
    let file = await client.getRawMessage(reference.inboxId, reference.messageId);
    return {
      url: file.download_url,
      expiresAt: new Date(Date.parse(file.expires_at) - 60_000).toISOString()
    };
  }
  if (
    reference.kind === 'attachment' &&
    reference.attachmentId &&
    (reference.messageId || reference.threadId)
  ) {
    let file = reference.messageId
      ? await client.getMessageAttachment(
          reference.inboxId,
          reference.messageId,
          reference.attachmentId
        )
      : await client.getThreadAttachment(
          reference.inboxId,
          reference.threadId!,
          reference.attachmentId
        );
    return {
      url: file.download_url,
      expiresAt: new Date(Date.parse(file.expires_at) - 60_000).toISOString()
    };
  }
  throw createApiServiceError('The download reference is incomplete. Request the file again.');
});
