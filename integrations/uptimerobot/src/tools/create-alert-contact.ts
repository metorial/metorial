import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createAlertContact = SlateTool.create(spec, {
  name: 'Create Alert Contact',
  key: 'create_alert_contact',
  description: `Create a new alert contact to receive notifications when monitors go up or down. Supports email, SMS, webhook, Pushbullet, and Pushover contact types.`,
  instructions: [
    'Slack, Zapier, and HipChat contacts must be configured through the UptimeRobot dashboard first.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      type: z
        .enum(['sms', 'email', 'webhook', 'pushbullet', 'pushover'])
        .describe('Type of alert contact'),
      friendlyName: z.string().optional().describe('Display name for the contact'),
      value: z
        .string()
        .describe('Contact address: email address, phone number, webhook URL, etc.')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the newly created alert contact'),
      status: z.number().describe('Initial status of the contact (0=Not activated)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let typeMap: Record<string, number> = {
      sms: 1,
      email: 2,
      webhook: 5,
      pushbullet: 6,
      pushover: 9
    };

    let result = await client.newAlertContact({
      type: typeMap[ctx.input.type]!,
      friendlyName: ctx.input.friendlyName,
      value: ctx.input.value
    });

    return {
      output: {
        contactId: String(result.id),
        status: result.status
      },
      message: `Created **${ctx.input.type}** alert contact${ctx.input.friendlyName ? ` "${ctx.input.friendlyName}"` : ''} (ID: ${result.id}).`
    };
  })
  .build();
