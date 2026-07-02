import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { contactGroupSchema, formatContactGroup } from '../lib/schemas';
import { googleContactsActionScopes } from '../scopes';
import { spec } from '../spec';

export let listContactGroups = SlateTool.create(spec, {
  name: 'List Contact Groups',
  key: 'list_contact_groups',
  description: `Lists all contact groups (labels) owned by the authenticated user, including both user-defined and system groups (like "My Contacts" and "Starred").`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleContactsActionScopes.listContactGroups)
  .input(
    z.object({
      pageSize: z
        .number()
        .optional()
        .describe('Maximum number of groups to return (default 100)'),
      pageToken: z.string().optional().describe('Token for fetching the next page of results')
    })
  )
  .output(
    z.object({
      contactGroups: z.array(contactGroupSchema).describe('List of contact groups'),
      nextPageToken: z.string().optional().describe('Token for fetching the next page'),
      totalItems: z.number().optional().describe('Total number of groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listContactGroups(ctx.input.pageSize, ctx.input.pageToken);

    let groups = (result.contactGroups || []).map(formatContactGroup);

    return {
      output: {
        contactGroups: groups,
        nextPageToken: result.nextPageToken,
        totalItems: result.totalItems
      },
      message: `Listed **${groups.length}** contact groups.${result.nextPageToken ? ' More pages available.' : ''}`
    };
  })
  .build();
