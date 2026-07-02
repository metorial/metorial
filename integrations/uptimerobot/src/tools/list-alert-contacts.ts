import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
  value: z.string().describe('Contact address (email, phone, webhook URL, etc.)')
});

export let listAlertContacts = SlateTool.create(spec, {
  name: 'List Alert Contacts',
  key: 'list_alert_contacts',
  description: `Retrieve alert contacts configured in your UptimeRobot account. Alert contacts receive notifications when monitors change state (up/down). Supports filtering by specific contact IDs and pagination.`,
  tags: {
    readOnly: true
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
      total: z.number().describe('Total number of alert contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getAlertContacts({
      alertContacts: ctx.input.contactIds?.join('-'),
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let contacts = result.alertContacts.map((c: any) => ({
      contactId: String(c.id),
      friendlyName: c.friendly_name,
      type: c.type,
      status: c.status,
      value: c.value
    }));

    return {
      output: {
        alertContacts: contacts,
        total: result.total ?? contacts.length
      },
      message: `Found **${result.total ?? contacts.length}** alert contact(s).`
    };
  })
  .build();
