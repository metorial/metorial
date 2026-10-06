import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaidClient } from '../lib/client';
import { spec } from '../spec';

export const removeAssetReportTool = SlateTool.create(spec, {
  name: 'Remove Asset Report',
  key: 'remove_asset_report',
  description:
    'Remove an Asset Report using its token. This invalidates report access and associated Audit Copies; it does not disconnect the source Items.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      assetReportToken: z
        .string()
        .describe('Token for the report explicitly authorized for removal')
    })
  )
  .output(
    z.object({
      removed: z.boolean().describe('Confirmed provider removal receipt'),
      requestId: z.string()
    })
  )
  .handleInvocation(async ctx => {
    const client = new PlaidClient({ ...ctx.auth, environment: ctx.config.environment });
    const result = await client.removeAssetReport(ctx.input.assetReportToken);
    return {
      output: { removed: result.removed, requestId: result.request_id },
      message: result.removed
        ? 'Plaid confirmed removal of the Asset Report.'
        : 'Plaid did not confirm removal. Check the report before any further action.'
    };
  })
  .build();
