import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCampaign = SlateTool.create(spec, {
  name: 'Get Campaign',
  key: 'get_campaign',
  description: `Retrieve detailed information about a specific campaign including its configuration, sequence, schedule, senders, and error state.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('The ID of the campaign to retrieve')
    })
  )
  .output(
    z.object({
      campaignId: z.string(),
      name: z.string().optional(),
      status: z.string().optional(),
      createdAt: z.string().optional(),
      hasError: z.boolean().optional(),
      errors: z.array(z.string()).optional(),
      labels: z.array(z.string()).optional(),
      sequenceId: z.string().optional(),
      scheduleIds: z.array(z.string()).optional(),
      senders: z
        .array(
          z.object({
            senderId: z.string().optional(),
            email: z.string().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let c = await client.getCampaign(ctx.input.campaignId);

    return {
      output: {
        campaignId: c._id,
        name: c.name,
        status: c.status ?? c.state,
        createdAt: c.createdAt,
        hasError: c.hasError,
        errors: c.errors,
        labels: c.labels,
        sequenceId: c.sequenceId,
        scheduleIds: c.scheduleIds,
        senders: c.senders?.map((s: any) => ({
          senderId: s.id,
          email: s.email
        }))
      },
      message: `Retrieved campaign **"${c.name}"** (${c.status ?? c.state ?? 'unknown status'}).`
    };
  })
  .build();
