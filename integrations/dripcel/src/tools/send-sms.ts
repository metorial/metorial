import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendSms = SlateTool.create(spec, {
  name: 'Send SMS',
  key: 'send_sms',
  description: `Send an individual SMS message to a contact. Supports personalized content using template variables for existing contacts. Returns a unique customer ID for tracking delivery status.`,
  instructions: [
    'Use deliveryMethod "transactional" for time-sensitive messages, "standard" for regular sends, and "reverse" for reverse-billed messages.',
    'Template variables in content only work when sending to contacts already in your organization.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      content: z
        .string()
        .describe(
          'SMS message content. May include template variables like {{firstname}} for existing contacts.'
        ),
      cell: z.string().describe('Recipient cell number'),
      country: z.string().describe('Country code (e.g. "ZA", "US", "GB", "AU")'),
      deliveryMethod: z
        .enum(['reverse', 'standard', 'transactional'])
        .describe('Delivery method for the SMS'),
      skipNonContacts: z
        .boolean()
        .optional()
        .default(true)
        .describe('Skip sending if the recipient is not an existing contact'),
      campaignId: z
        .string()
        .optional()
        .describe('Campaign ID to associate this send with (enables reply hooks)'),
      testMode: z.boolean().optional().describe('Enable test mode via sendOptions')
    })
  )
  .output(
    z.object({
      customerId: z
        .string()
        .describe('Unique identifier for this send, used for delivery tracking'),
      totalCost: z.number().describe('Credit cost of the send')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let sendOptions: Record<string, any> | undefined;
    if (ctx.input.testMode) {
      sendOptions = { test: true };
    }
    let result = await client.sendSms({
      content: ctx.input.content,
      cell: ctx.input.cell,
      country: ctx.input.country,
      deliveryMethod: ctx.input.deliveryMethod,
      skipNonContacts: ctx.input.skipNonContacts ?? true,
      campaignId: ctx.input.campaignId,
      sendOptions
    });
    return {
      output: {
        customerId: result.data?.customerId ?? result.customerId ?? '',
        totalCost: result.data?.totalCost ?? result.totalCost ?? 0
      },
      message: `SMS sent to **${ctx.input.cell}**. Customer ID: \`${result.data?.customerId ?? result.customerId}\`, cost: ${result.data?.totalCost ?? result.totalCost} credits.`
    };
  })
  .build();
