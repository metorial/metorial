import { getFileUrlTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { parsed } from '../lib/helpers';
import { spec } from '../spec';

const referenceSchema = z
  .object({ applicationId: z.string(), attachmentId: z.string() })
  .strict();
export const getFileUrl = getFileUrlTool(spec, async ctx => {
  const reference = parsed(referenceSchema, ctx.input.reference);
  const file = await new GreenhouseClient(ctx.auth, ctx.config).getApplicationFile(
    reference.applicationId,
    reference.attachmentId
  );
  return { url: file.url, expiresAt: file.expiresAt, headers: {}, query: {} };
});
