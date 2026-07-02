import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendCampaign = SlateTool.create(spec, {
  name: 'Send or Schedule Campaign',
  key: 'send_campaign',
  description: `Send a campaign immediately, schedule it for a specific time, or pause a running campaign. Optionally assign a recipient list before sending.`,
  instructions: [
    'Use **action** "send" to send immediately, "schedule" to send at a specific time, or "pause" to pause.',
    'When scheduling, provide **scheduleTime** in the format "ddMMyyyy hh:mmtt" (e.g., "14032026 02:30PM").',
    'You can assign recipients before sending by providing **recipientFilterBy** and **recipientCategories**.'
  ],
  constraints: ['Campaign API is only available to paid plan users.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign to send, schedule, or pause'),
      action: z
        .enum(['send', 'schedule', 'pause'])
        .describe('Action to perform on the campaign'),
      scheduleTime: z
        .string()
        .optional()
        .describe(
          'Schedule time in "ddMMyyyy hh:mmtt" format, e.g. "14032026 02:30PM" (required when action is "schedule")'
        ),
      recipientFilterBy: z
        .string()
        .optional()
        .describe('Filter type for recipient assignment'),
      recipientCategories: z
        .array(z.string())
        .optional()
        .describe('Category IDs for recipient list assignment')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status'),
      statusCode: z.string().describe('Response status code'),
      message: z.string().optional().describe('Response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    // Assign recipients if provided
    if (ctx.input.recipientFilterBy && ctx.input.recipientCategories) {
      await client.assignRecipientList({
        campaignId: ctx.input.campaignId,
        filterBy: ctx.input.recipientFilterBy,
        categoryList: ctx.input.recipientCategories
      });
      ctx.info('Assigned recipient list to campaign');
    }

    let result: any;
    let actionLabel: string;

    switch (ctx.input.action) {
      case 'send':
        result = await client.sendCampaign(ctx.input.campaignId);
        actionLabel = 'sent';
        break;
      case 'schedule':
        if (!ctx.input.scheduleTime) {
          throw new Error('scheduleTime is required when action is "schedule"');
        }
        result = await client.scheduleCampaign(ctx.input.campaignId, ctx.input.scheduleTime);
        actionLabel = `scheduled for ${ctx.input.scheduleTime}`;
        break;
      case 'pause':
        result = await client.pauseCampaign(ctx.input.campaignId);
        actionLabel = 'paused';
        break;
    }

    return {
      output: {
        status: result.Result?.Status ?? 'Unknown',
        statusCode: result.Result?.StatusCode ?? 'Unknown',
        message: result.Result?.Message ?? result.Result?.ErrorMessage
      },
      message: `Campaign **${ctx.input.campaignId}** ${actionLabel}.`
    };
  })
  .build();
