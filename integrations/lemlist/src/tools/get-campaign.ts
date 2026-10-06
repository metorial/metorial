import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, campaignOutput, optionalStrings, optionalText, rows } from '../lib/client';
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
    const client = new Client({ token: ctx.auth.token }),
      c = await client.getCampaign(ctx.input.campaignId);
    return {
      output: {
        ...campaignOutput(c),
        sequenceId: optionalText(c.sequenceId),
        scheduleIds: optionalStrings(c.scheduleIds),
        senders:
          c.senders == null
            ? undefined
            : rows(c.senders).map(sender => ({
                senderId: optionalText(sender.id),
                email: optionalText(sender.email)
              }))
      },
      message: `Retrieved campaign \`${ctx.input.campaignId}\`.`
    };
  })
  .build();
