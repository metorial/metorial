import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  assertFileReferenceSafe,
  getGeneratedDownloads,
  qrRefreshAt,
  regeneratableFileEndpoints,
  validateDownloadUrl
} from '../lib/files';
import { qrParametersSchema } from '../lib/schemas';
import { spec } from '../spec';

let qrReferenceSchema = z.object({ parameters: qrParametersSchema }).strict();
let genericReferenceSchema = z
  .object({
    kind: z.literal('generated_file'),
    endpoint: z.string(),
    parameters: z.record(z.string(), z.unknown()).optional(),
    path: z.array(z.string())
  })
  .strict();
let referenceSchema = z.union([genericReferenceSchema, qrReferenceSchema]);

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = referenceSchema.safeParse(ctx.input.reference);
  if (!reference.success)
    throw createApiServiceError(
      'The generated-file reference is invalid. Generate the file again.'
    );
  assertFileReferenceSafe(reference.data, ctx.auth.token);
  let client = new Client({ token: ctx.auth.token });
  if ('kind' in reference.data) {
    let source = reference.data;
    if (!regeneratableFileEndpoints.has(client.getEndpointName(source.endpoint)))
      throw createApiServiceError('This API does not support generated-file renewal.');
    let { data } = await client.callEndpoint(source.endpoint, 'POST', source.parameters);
    let file = getGeneratedDownloads(data).find(
      item => JSON.stringify(item.path) === JSON.stringify(source.path)
    );
    if (!file || file.expires === undefined)
      throw createApiServiceError(
        'APIVerve did not return the generated file and expiration needed to renew this download.'
      );
    return { url: file.url, expiresAt: qrRefreshAt(file.expires) };
  }
  let { data } = await client.generateQrCode(reference.data.parameters);
  return { url: validateDownloadUrl(data.downloadURL), expiresAt: qrRefreshAt(data.expires) };
});
