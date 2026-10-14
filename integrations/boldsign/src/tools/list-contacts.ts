import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description:
    'Find saved contacts by name or email so you can select recipients for signature requests.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Page number, starting at 1; defaults to 1'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Contacts per page; defaults to 10'),
      searchKey: z.string().optional().describe('Search contacts by keyword'),
      contactType: z
        .enum(['MyContacts', 'AllContacts'])
        .optional()
        .describe('Contact ownership filter; defaults to AllContacts')
    })
  )
  .output(
    z.object({
      pageDetails: z.record(z.string(), z.any()).describe('Pagination metadata'),
      result: z
        .array(z.record(z.string(), z.any()))
        .describe('Contact IDs, names, email addresses, and company details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ ...ctx.auth, region: ctx.config.region });
    let result = await client.listContacts(ctx.input);
    return {
      output: result,
      message: `Found **${result.result.length}** contacts on this page.`
    };
  })
  .build();
