import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let makeCall = SlateTool.create(spec, {
  name: 'Make Outbound Call',
  key: 'make_call',
  description: `Initiate an AI-powered outbound phone call to a specified phone number via a configured voice widget. The widget must be connected to a telephony provider (Twilio, Plivo, or Telnyx). Supports dynamic prompt variables for personalized conversations.`,
  constraints: [
    'Phone numbers must be in E.164 format (e.g., +14155552671)',
    'Widget must be connected to Twilio, Plivo, or Telnyx'
  ]
})
  .input(
    z.object({
      widgetId: z
        .string()
        .describe('Widget ID to use for the call (must have telephony configured)'),
      phoneNumber: z.string().describe('Phone number to call in E.164 format'),
      promptVariables: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Dynamic variables for prompt personalization, e.g. { "customerName": "John" }'
        )
    })
  )
  .output(
    z.object({
      conversationId: z.string().optional(),
      contactId: z.string().optional(),
      widgetId: z.string().optional(),
      assistantId: z.string().optional(),
      direction: z.string().optional(),
      fromNumber: z.string().optional(),
      toNumber: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.makeCall(ctx.input.widgetId, {
      to: ctx.input.phoneNumber,
      prompt_dynamic_variables: ctx.input.promptVariables
    });
    let data = result.data || result;

    return {
      output: {
        conversationId: data.conversation_id || data.id,
        contactId: data.contact_id,
        widgetId: data.widget_id,
        assistantId: data.assistant_id,
        direction: data.direction,
        fromNumber: data.from_number,
        toNumber: data.to_number
      },
      message: `Initiated outbound call to **${ctx.input.phoneNumber}** via widget \`${ctx.input.widgetId}\`.`
    };
  })
  .build();
