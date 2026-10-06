import { SlateTool } from 'slates';
import { z } from 'zod';
import { resolveRegion, StitchImportClient } from '../lib/client';
import { spec } from '../spec';

export const getImportStatus = SlateTool.create(spec, {
  name: 'Get Import API Status',
  key: 'get_import_status',
  description:
    'Checks the public Import API health for your configured region. This does not validate credentials or confirm that a batch reached your warehouse.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ name: z.string(), status: z.string(), reason: z.string().nullable() }))
  .handleInvocation(async ctx => {
    const result = await new StitchImportClient(
      { token: '', region: resolveRegion(ctx.auth.region, ctx.config) },
      false
    ).getStatus();
    return {
      output: { ...result, reason: result.reason ?? null },
      message: `Import API status: **${result.status}**.`
    };
  })
  .build();
