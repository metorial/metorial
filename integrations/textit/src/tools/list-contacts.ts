import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve contacts from your TextIt workspace. Filter by UUID, URN, group, or modification date. Returns contacts sorted by most recently modified first.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactUuid: z.string().optional().describe('Filter by a specific contact UUID'),
      contactUrn: z
        .string()
        .optional()
        .describe('Filter by a specific contact URN (e.g., tel:+250788123123)'),
      groupUuidOrName: z.string().optional().describe('Filter by group UUID or group name'),
      before: z
        .string()
        .optional()
        .describe('Return only contacts modified before this date (ISO 8601)'),
      after: z
        .string()
        .optional()
        .describe('Return only contacts modified after this date (ISO 8601)')
    })
  )
  .output(
    z.object({
      contacts: z.array(
        z.object({
          contactUuid: z.string(),
          name: z.string().nullable(),
          status: z.string(),
          language: z.string().nullable(),
          urns: z.array(z.string()),
          groups: z.array(
            z.object({
              groupUuid: z.string(),
              name: z.string()
            })
          ),
          fields: z.record(z.string(), z.string().nullable()),
          createdOn: z.string(),
          modifiedOn: z.string(),
          lastSeenOn: z.string().nullable()
        })
      ),
      hasMore: z.boolean().describe('Whether there are more results to fetch')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.listContacts({
      uuid: ctx.input.contactUuid,
      urn: ctx.input.contactUrn,
      group: ctx.input.groupUuidOrName,
      before: ctx.input.before,
      after: ctx.input.after
    });

    let contacts = result.results.map(c => ({
      contactUuid: c.uuid,
      name: c.name,
      status: c.status,
      language: c.language,
      urns: c.urns,
      groups: c.groups.map(g => ({ groupUuid: g.uuid, name: g.name })),
      fields: c.fields,
      createdOn: c.created_on,
      modifiedOn: c.modified_on,
      lastSeenOn: c.last_seen_on
    }));

    return {
      output: {
        contacts,
        hasMore: result.next !== null
      },
      message: `Found **${contacts.length}** contact(s)${result.next ? ' (more results available)' : ''}.`
    };
  })
  .build();
