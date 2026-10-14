import { createApiServiceError, SlateTool } from 'slates';
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
    'Set **recipientFilterBy** to "1" to assign all subscribers, or "2" with **recipientCategories** to restrict recipients by subcategory.',
    '**recipientCategories** and **recipientFilterType** apply only to subcategory filtering (recipientFilterBy "2").'
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
        .describe(
          'Recipient assignment: "1" for all subscribers or "2" for subcategory filtering'
        ),
      recipientCategories: z
        .array(z.string())
        .optional()
        .describe(
          'Numeric subcategory IDs for recipientFilterBy "2". Call list_subcategories to discover IDs.'
        ),
      recipientFilterType: z
        .enum(['AND', 'OR'])
        .optional()
        .describe(
          'Combine subcategory filters using AND or OR for recipientFilterBy "2" (default OR)'
        )
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

    if (ctx.input.action === 'schedule' && !ctx.input.scheduleTime) {
      throw createApiServiceError('scheduleTime is required when action is "schedule"');
    }
    if (
      ctx.input.recipientFilterBy !== undefined &&
      !['1', '2'].includes(ctx.input.recipientFilterBy)
    ) {
      throw createApiServiceError('recipientFilterBy must be "1" or "2".');
    }
    if (ctx.input.recipientFilterBy === '1' && ctx.input.recipientCategories?.length) {
      throw createApiServiceError(
        'recipientFilterBy "1" assigns all subscribers. Use "2" to restrict recipients to recipientCategories, or omit recipientCategories to assign all subscribers.'
      );
    }
    if (ctx.input.recipientFilterType !== undefined && ctx.input.recipientFilterBy !== '2') {
      throw createApiServiceError(
        'recipientFilterType requires recipientFilterBy "2" and recipientCategories. Omit recipientFilterType when assigning all subscribers.'
      );
    }
    if (ctx.input.recipientFilterBy === '2' && !ctx.input.recipientCategories?.length) {
      throw createApiServiceError(
        'Provide recipientCategories when recipientFilterBy is "2".'
      );
    }
    if (
      ctx.input.recipientCategories !== undefined &&
      ctx.input.recipientFilterBy === undefined
    ) {
      throw createApiServiceError('Provide recipientFilterBy with recipientCategories.');
    }
    if (ctx.input.recipientFilterBy !== undefined) {
      await client.assignRecipientList({
        campaignId: ctx.input.campaignId,
        filterBy: ctx.input.recipientFilterBy,
        categoryList: ctx.input.recipientCategories ?? [],
        filterType: ctx.input.recipientFilterType
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
          throw createApiServiceError('scheduleTime is required when action is "schedule"');
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
