import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { contactValue } from '../lib/types';
import { spec } from '../spec';

let alertContactSchema = z.object({
  contactId: z.string().describe('Unique alert contact ID'),
  friendlyName: z.string().describe('Display name of the contact'),
  type: z
    .number()
    .describe(
      'Contact type: 1=SMS, 2=Email, 3=Twitter, 5=WebHook, 6=Pushbullet, 7=Zapier, 9=Pushover, 11=Slack'
    ),
  status: z.number().describe('Contact status: 0=Not activated, 1=Paused, 2=Active'),
  value: z.string().describe('Email address; credential-bearing contact values are redacted')
});

export let listAlertContacts = SlateTool.create(spec, {
  name: 'List Alert Contacts',
  key: 'list_alert_contacts',
  description: `Use a Legacy API Key connection (API v2). Retrieve alert contacts configured in your UptimeRobot account. Alert contacts receive notifications when monitors change state (up/down). Supports filtering by specific contact IDs and pagination.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      contactIds: z
        .array(z.string())
        .optional()
        .describe('Filter to specific alert contact IDs'),
      offset: z.number().optional().describe('Pagination offset (default 0)'),
      limit: z.number().optional().describe('Number of results per page (max 50)')
    })
  )
  .output(
    z.object({
      alertContacts: z.array(alertContactSchema),
      offset: z.number().optional().describe('Current pagination offset'),
      limit: z.number().optional().describe('Current pagination limit'),
      nextOffset: z
        .number()
        .nullable()
        .optional()
        .describe('Offset for the next page, or null when complete'),
      total: z.number().describe('Total number of alert contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let result = await client.getAlertContacts({
      alertContacts: ctx.input.contactIds?.join('-'),
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let contacts = result.alertContacts.map(c => ({
      contactId: String(c.id),
      friendlyName: c.friendly_name,
      type: c.type,
      status: c.status,
      value: contactValue(c.type, c.value)
    }));

    return {
      output: {
        alertContacts: contacts,
        total: result.total,
        offset: result.offset,
        limit: result.limit,
        nextOffset:
          result.offset + contacts.length < result.total
            ? result.offset + contacts.length
            : null
      },
      message: `Found **${result.total}** alert contact(s).`
    };
  })
  .build();
