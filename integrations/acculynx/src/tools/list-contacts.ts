import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContactsTool = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve a paginated list of contacts from AccuLynx. Returns contact summaries.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageSize: z.number().optional().describe('Number of items per page'),
      pageStartIndex: z.number().optional().describe('Index of the first element to return')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of contact summary objects'),
      totalCount: z.number().optional().describe('Total number of contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getContacts({
      pageSize: ctx.input.pageSize,
      pageStartIndex: ctx.input.pageStartIndex
    });

    let contacts = Array.isArray(result)
      ? result
      : (result?.items ?? result?.data ?? [result]);
    let totalCount = result?.totalCount ?? result?.total ?? contacts.length;

    return {
      output: { contacts, totalCount },
      message: `Retrieved **${contacts.length}** contacts.`
    };
  })
  .build();
