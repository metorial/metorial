import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deletePolicy = SlateTool.create(spec, {
  name: 'Delete Policy',
  key: 'delete_policy',
  description: `Delete an insurance policy from AgencyZoom. This action is permanent and cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      policyId: z.string().describe('ID of the policy to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the policy was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    await client.deletePolicy(ctx.input.policyId);

    return {
      output: { success: true },
      message: `Deleted policy **${ctx.input.policyId}**.`
    };
  })
  .build();
