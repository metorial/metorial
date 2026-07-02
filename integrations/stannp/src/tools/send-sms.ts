import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendSms = SlateTool.create(spec, {
  name: 'Send SMS',
  key: 'send_sms',
  description: `Send an SMS message to a phone number or an existing recipient. Supports template tags when using a recipient ID. Use test mode to validate without sending.`,
  instructions: ['Provide either a phoneNumber or a recipientId, not both.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      message: z
        .string()
        .describe(
          'SMS message content. Template tags can be used when targeting a recipientId.'
        ),
      phoneNumber: z
        .string()
        .optional()
        .describe('Phone number to send to (for recipients not in your database)'),
      recipientId: z.number().optional().describe('Existing recipient ID to send to'),
      country: z
        .string()
        .optional()
        .describe('Two-character country code (defaults to account region)'),
      test: z
        .boolean()
        .optional()
        .describe('Send in test mode without actually dispatching or charging')
    })
  )
  .output(
    z.object({
      smsId: z.string().describe('ID of the sent SMS'),
      status: z.string().optional().describe('SMS status'),
      cost: z.string().optional().describe('Cost of the SMS'),
      phoneNumber: z.string().optional().describe('Destination phone number'),
      messageParts: z.number().optional().describe('Number of message parts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let result = await client.sendSms({
      message: ctx.input.message,
      phoneNumber: ctx.input.phoneNumber,
      recipientId: ctx.input.recipientId,
      country: ctx.input.country,
      test: ctx.input.test
    });

    return {
      output: {
        smsId: String(result.id),
        status: result.status,
        cost: result.cost,
        phoneNumber: result.phone_number,
        messageParts: result.message_parts
      },
      message: ctx.input.test
        ? `Test SMS created (ID: ${result.id}). No message was dispatched.`
        : `SMS sent (ID: ${result.id}) to **${result.phone_number}**. Status: ${result.status}.`
    };
  })
  .build();
