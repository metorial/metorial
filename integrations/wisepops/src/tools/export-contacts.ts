import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let exportContacts = SlateTool.create(spec, {
  name: 'Export Contacts',
  key: 'export_contacts',
  description:
    'Download one batch of collected contacts as a JSON file, preserving the original form fields and provider metadata. Filter by collection date or campaign when needed.',
  instructions: [
    'Call list_campaigns to discover campaign IDs.',
    'This exports one API response, not the entire contact history. The provider only documents a collection-date filter and page size, with no cursor or offset.'
  ],
  constraints: [
    'Maximum batch size is 1000 contacts; the default is 100.',
    'API access is available on Custom plans and is subject to 1,500 calls per 30 days on standard limits.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      collectedAfter: z
        .string()
        .optional()
        .describe(
          'UTC date to retrieve contacts collected after, e.g. "2024-01-01T00:00:00Z".'
        ),
      wisepopId: z
        .number()
        .optional()
        .describe('Campaign ID returned by list_campaigns. Omit to include all campaigns.'),
      pageSize: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe('Number of contacts to export in this batch (1-1000). Defaults to 100.')
    })
  )
  .output(
    z.object({
      contactCount: z.number().describe('Number of contacts in the exported batch.'),
      filename: z.string().describe('Name of the downloadable JSON file.'),
      mimeType: z.string().describe('MIME type of the exported file.'),
      batchLimitReached: z
        .boolean()
        .describe('Whether the batch contains the requested maximum. More contacts may exist.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let contacts = await client.listContacts(ctx.input);
    let filename = 'wisepops-contacts.json';
    let mimeType = 'application/json';

    await ctx.addAttachment({
      type: 'content',
      content: new Response(JSON.stringify(contacts, null, 2), {
        headers: { 'Content-Type': `${mimeType}; charset=utf-8` }
      }),
      filename,
      mimeType
    });

    return {
      output: {
        contactCount: contacts.length,
        filename,
        mimeType,
        batchLimitReached: contacts.length >= (ctx.input.pageSize ?? 100)
      },
      message: `Prepared **${contacts.length}** contact(s) as a downloadable JSON file.`
    };
  })
  .build();
