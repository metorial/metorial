import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve contacts (emails, phone numbers, and custom fields) collected through Wisepops campaigns.
Supports filtering by collection date and by specific campaign. Each contact includes the collection timestamp, campaign ID, IP address, country code, and all collected form fields.`,
  constraints: [
    'Maximum page size is 1000 contacts per request.',
    'Subject to API rate limits (1,500 calls per 30 days on standard plans).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collectedAfter: z
        .string()
        .optional()
        .describe(
          'ISO 8601 UTC date to filter contacts collected after this date, e.g. "2024-01-01T00:00:00Z".'
        ),
      wisepopId: z
        .number()
        .optional()
        .describe('Campaign ID to retrieve contacts from a specific popup campaign only.'),
      pageSize: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe('Number of results per request (1-1000). Defaults to 100.')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(
          z.object({
            collectedAt: z
              .string()
              .describe('ISO 8601 timestamp when the contact was collected.'),
            wisepopId: z.number().describe('ID of the campaign that collected this contact.'),
            formSession: z
              .string()
              .describe(
                'UUID identifying the form session, useful for merging multi-step submissions.'
              ),
            ip: z.string().describe('IP address of the visitor.'),
            countryCode: z.string().describe('ISO country code of the visitor.'),
            fields: z
              .record(z.string(), z.string())
              .describe(
                'Form fields collected from the visitor (e.g. email, name, custom fields).'
              )
          })
        )
        .describe('List of collected contacts.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let contacts = await client.listContacts({
      collectedAfter: ctx.input.collectedAfter,
      wisepopId: ctx.input.wisepopId,
      pageSize: ctx.input.pageSize
    });

    let mappedContacts = contacts.map(c => ({
      collectedAt: c.collected_at,
      wisepopId: c.wisepop_id,
      formSession: c.form_session,
      ip: c.ip,
      countryCode: c.country_code,
      fields: c.fields
    }));

    return {
      output: { contacts: mappedContacts },
      message: `Retrieved **${mappedContacts.length}** contact(s).`
    };
  })
  .build();
