import { createApiServiceError, getFileUrlTool } from 'slates';
import { Client } from '../lib/client';
import { resendFileReferenceSchema, resolveResendFileUrl } from '../lib/files';
import { spec } from '../spec';

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = resendFileReferenceSchema.safeParse(ctx.input.reference);
  if (!reference.success) {
    throw createApiServiceError('The file reference is invalid. Request the file again.');
  }

  let client = new Client({ token: ctx.auth.token });
  let file = await resolveResendFileUrl(client, reference.data);

  return { url: file.url, expiresAt: file.refreshAt };
});
