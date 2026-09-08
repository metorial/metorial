import { getFileUrlTool } from 'slates';
import { spec } from '../spec';

let FILE_URL_EXPIRATION_MS = 60 * 1000;
let ATTACHMENT_SERVER_URL = 'https://attachment-url-server.vercel.app/';

export let AUTHENTICATED_FILE_REFERENCE = {
  type: 'test_attachment',
  id: 'authenticated-file'
};

export let createAuthenticatedFileUrl = (token: string) => {
  let expiresAt = new Date(Date.now() + FILE_URL_EXPIRATION_MS).toISOString();

  return {
    url: new URL('/api/attachment', ATTACHMENT_SERVER_URL).toString(),
    expiresAt,
    headers: {
      'x-attachment-token': token
    },
    query: {
      token,
      expiresAt
    }
  };
};

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = ctx.input.reference as Partial<typeof AUTHENTICATED_FILE_REFERENCE> | null;

  if (
    reference?.type !== AUTHENTICATED_FILE_REFERENCE.type ||
    reference.id !== AUTHENTICATED_FILE_REFERENCE.id
  ) {
    throw new Error('Unknown attachment reference');
  }

  return createAuthenticatedFileUrl(ctx.auth.token);
});
