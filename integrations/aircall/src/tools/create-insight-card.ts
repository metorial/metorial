import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      callId: z.number().describe('ID of the ongoing call to display the insight card on'),
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
      success: z.boolean().describe('Whether the insight card was created successfully'),
      callId: z.number().describe('The call ID the insight card was pushed to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    await client.createInsightCard(ctx.input.callId, ctx.input.contents);

    return {
      output: {
        success: true,
        callId: ctx.input.callId
      },
      message: `Pushed insight card with **${ctx.input.contents.length}** lines to call **#${ctx.input.callId}**.`
    };
  })
  .build();
