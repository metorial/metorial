import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { recipientSchema } from '../lib/types';
import { spec } from '../spec';

export let createRecipient = SlateTool.create(spec, {
  name: 'Create Recipient',
  key: 'create_recipient',
  description: `Add a new alert recipient (notification channel) to your account. Supports email, SMS, webhook, Slack-compatible, and Microsoft Teams. Once created, the recipient can be assigned to individual checks.`,
  instructions: [
    'For webhooks, set type to "webhook" and value to the endpoint URL.',
    'For Slack-compatible, set type to "slack_compatible" and value to the incoming webhook URL.',
    'For Microsoft Teams, set type to "msteams" and value to the connector URL.'
  ]
})
  .input(
    z.object({
      type: z
        .enum(['email', 'sms', 'webhook', 'slack_compatible', 'msteams'])
        .describe('Type of notification channel'),
      value: z
        .string()
        .describe('Recipient address: email address, phone number, or webhook URL'),
      name: z.string().optional().describe('Display name for the recipient'),
      selected: z
        .boolean()
        .optional()
        .describe('Whether this recipient is selected by default for new checks')
    })
  )
  .output(recipientSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let recipient = await client.createRecipient(ctx.input);

    return {
      output: recipient,
      message: `Created ${recipient.type} recipient **${recipient.name || recipient.value}** (ID: \`${recipient.recipientId}\`).`
    };
  })
  .build();

export let deleteRecipient = SlateTool.create(spec, {
  name: 'Delete Recipient',
  key: 'delete_recipient',
  description: `Remove an alert recipient (notification channel) from your account. The recipient will no longer receive alerts for any checks.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      recipientId: z.string().describe('The unique identifier of the recipient to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the recipient was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteRecipient(ctx.input.recipientId);

    return {
      output: result,
      message: `Deleted recipient \`${ctx.input.recipientId}\`.`
    };
  })
  .build();
