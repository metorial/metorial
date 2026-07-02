import { SlateTool } from 'slates';
import { z } from 'zod';
import { DeadlineFunnelClient } from '../lib/client';
import { spec } from '../spec';

export let startDeadline = SlateTool.create(spec, {
  name: 'Start Deadline',
  key: 'start_deadline',
  description: `Start a personalized deadline countdown for a specific subscriber in a Deadline Funnel campaign. The subscriber is identified by their email address and will be assigned a unique deadline based on the campaign settings.`,
  instructions: [
    'You must provide a valid campaign ID. Use the **List Campaigns** tool to find available campaigns.',
    'For the deadline to display correctly, subscribers must click a Deadline Funnel email link before reaching a page with a countdown timer.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z
        .string()
        .describe('ID of the Deadline Funnel campaign to start the deadline for'),
      email: z.string().describe('Email address of the subscriber to start the deadline for'),
      firstName: z.string().optional().describe('First name of the subscriber')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deadline was successfully started'),
      email: z.string().describe('Email address of the subscriber'),
      campaignId: z.string().describe('ID of the campaign the deadline was started for')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeadlineFunnelClient({ token: ctx.auth.token });
    let result = await client.startDeadline({
      campaignId: ctx.input.campaignId,
      email: ctx.input.email,
      firstName: ctx.input.firstName
    });

    return {
      output: result,
      message: `Deadline started for **${ctx.input.email}** in campaign **${ctx.input.campaignId}**.`
    };
  })
  .build();
