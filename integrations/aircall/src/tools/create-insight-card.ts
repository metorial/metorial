import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { exactId, fail, numericCallId } from '../lib/contracts';
import { spec } from '../spec';

export let createInsightCard = SlateTool.create(spec, {
  name: 'Create Insight Card',
  key: 'create_insight_card',
  description: `Display contextual information to agents during an ongoing call. Push custom data such as customer details, CRM links, or account information into the agent's call view. Cards are only visible during the active call and are not stored afterward.`,
  constraints: [
    'Insight cards are only visible during ongoing calls.',
    'Cards are not stored after the call ends.',
    'Payload must be under 10KB.'
  ]
})
  .input(
    z.object({
      callIdExact: z
        .string()
        .optional()
        .describe('Exact decimal Int64 ID from list_calls; supply instead of callId'),
      callId: z
        .number()
        .optional()
        .describe('ID of the ongoing call to display the insight card on'),
      contents: z
        .array(
          z.object({
            type: z
              .enum(['title', 'shortText'])
              .describe('Card line type: title for headings, shortText for label-value pairs'),
            text: z.string().describe('The text content to display'),
            label: z
              .string()
              .optional()
              .describe('Label shown before the text (only for shortText type)'),
            link: z.string().optional().describe('URL to open when the line is clicked')
          })
        )
        .describe('Lines of content to display in the insight card')
    })
  )
  .output(
    z.object({
      accepted: z.boolean().optional(),
      confirmed: z.boolean().optional(),
      pending: z.boolean().optional(),
      success: z.boolean().describe('Whether the insight card was created successfully'),
      callIdExact: z
        .string()
        .optional()
        .describe('Exact decimal Int64 ID from list_calls; supply instead of callId'),
      callId: z.number().optional().describe('The call ID the insight card was pushed to')
    })
  )
  .handleInvocation(async ctx => {
    const callIdExact = exactId(ctx.input.callId, ctx.input.callIdExact),
      client = new Client(ctx.auth);
    const call = await client.getCall(callIdExact);
    if (call.status === 'done') fail('Insight cards require an ongoing call.');
    await client.createInsightCard(callIdExact, ctx.input.contents);
    return {
      output: {
        success: true,
        callId: numericCallId(callIdExact),
        callIdExact,
        accepted: true,
        confirmed: false
      },
      message:
        'Aircall acknowledged the temporary insight-card request. Cards are not retained after the call; no independent display confirmation is available.'
    };
  })
  .build();
