import { SlateTool } from 'slates';
import { z } from 'zod';
import { TapfiliateClient } from '../lib/client';
import { spec } from '../spec';

export let manageMlmParent = SlateTool.create(spec, {
  name: 'Manage MLM Parent',
  key: 'manage_mlm_parent',
  description: `Set or remove a parent-child relationship between affiliates for multi-level marketing (MLM). The parent affiliate earns commissions from the child affiliate's conversions based on the MLM levels configured in the program.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      affiliateId: z.string().describe('ID of the child affiliate'),
      action: z
        .enum(['set', 'remove'])
        .describe('Whether to set or remove the parent relationship'),
      parentAffiliateId: z
        .string()
        .optional()
        .describe('ID of the parent affiliate (required when action is "set")')
    })
  )
  .output(
    z.object({
      affiliateId: z.string().describe('ID of the child affiliate'),
      parentAffiliateId: z.string().optional().describe('ID of the parent affiliate, if set')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });

    if (ctx.input.action === 'set') {
      if (!ctx.input.parentAffiliateId) {
        throw new Error('parentAffiliateId is required when action is "set"');
      }
      await client.setMlmParent(ctx.input.affiliateId, ctx.input.parentAffiliateId);
      return {
        output: {
          affiliateId: ctx.input.affiliateId,
          parentAffiliateId: ctx.input.parentAffiliateId
        },
        message: `Set \`${ctx.input.parentAffiliateId}\` as MLM parent of \`${ctx.input.affiliateId}\`.`
      };
    } else {
      await client.removeMlmParent(ctx.input.affiliateId);
      return {
        output: {
          affiliateId: ctx.input.affiliateId
        },
        message: `Removed MLM parent from \`${ctx.input.affiliateId}\`.`
      };
    }
  })
  .build();
