import { SlateTool } from 'slates';
import { z } from 'zod';
import { KommoClient } from '../lib/client';
import { spec } from '../spec';

export let listLossReasonsTool = SlateTool.create(spec, {
  name: 'List Loss Reasons',
  key: 'list_loss_reasons',
  description:
    'List the account’s lead loss reasons. Returns IDs and names to use with update_lead when closing a lead as lost.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      lossReasons: z.array(
        z.object({
          lossReasonId: z.number().describe('Loss reason ID for update_lead'),
          name: z.string().describe('Loss reason name'),
          sort: z.number().optional().describe('Display order'),
          createdAt: z.number().optional().describe('Creation timestamp in Unix seconds'),
          updatedAt: z.number().optional().describe('Last update timestamp in Unix seconds')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new KommoClient({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain || (ctx.config as { subdomain?: string }).subdomain
    });
    let reasons = await client.listLossReasons();
    let lossReasons = reasons.map(
      (reason: {
        id: number;
        name: string;
        sort?: number;
        created_at?: number;
        updated_at?: number;
      }) => ({
        lossReasonId: reason.id,
        name: reason.name,
        sort: reason.sort,
        createdAt: reason.created_at,
        updatedAt: reason.updated_at
      })
    );
    return {
      output: { lossReasons },
      message: `Found **${lossReasons.length}** lead loss reason(s).`
    };
  })
  .build();
