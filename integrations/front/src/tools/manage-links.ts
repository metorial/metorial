import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let linkOutputSchema = z.object({
  linkId: z.string(),
  name: z.string().optional(),
  type: z.string().optional(),
  externalUrl: z.string(),
  customFields: z.record(z.string(), z.string()).optional()
});

export let listLinks = SlateTool.create(spec, {
  name: 'List Links',
  key: 'list_links',
  description: `List links that connect Front conversations to items in external systems (e.g., tickets, orders, feature requests).`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query to filter links'),
      pageToken: z.string().optional().describe('Pagination token'),
      limit: z.number().optional().describe('Maximum number of results')
    })
  )
  .output(
    z.object({
      links: z.array(linkOutputSchema),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listLinks({
      q: ctx.input.query,
      page_token: ctx.input.pageToken,
      limit: ctx.input.limit
    });

    let links = result._results.map(l => ({
      linkId: l.id,
      name: l.name,
      type: l.type,
      externalUrl: l.external_url,
      customFields: l.custom_fields
    }));

    return {
      output: { links, nextPageToken: result._pagination?.next || undefined },
      message: `Found **${links.length}** links.`
    };
  });

export let createLink = SlateTool.create(spec, {
  name: 'Create Link',
  key: 'create_link',
  description: `Create a new link to connect Front conversations with an external system item. After creating, use the Update Conversation tool to associate it with conversations.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      externalUrl: z.string().describe('URL to the external resource'),
      name: z.string().optional().describe('Display name for the link'),
      type: z.string().optional().describe('Link type identifier'),
      customFields: z.record(z.string(), z.string()).optional().describe('Custom field values')
    })
  )
  .output(linkOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let link = await client.createLink({
      name: ctx.input.name,
      external_url: ctx.input.externalUrl,
      type: ctx.input.type,
      custom_fields: ctx.input.customFields
    });

    return {
      output: {
        linkId: link.id,
        name: link.name,
        type: link.type,
        externalUrl: link.external_url,
        customFields: link.custom_fields
      },
      message: `Created link **${link.name || link.external_url}**.`
    };
  });

export let updateLink = SlateTool.create(spec, {
  name: 'Update Link',
  key: 'update_link',
  description: `Update an existing link's name or custom fields.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      linkId: z.string().describe('ID of the link to update'),
      name: z.string().optional().describe('Updated display name'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Updated custom field values')
    })
  )
  .output(linkOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let link = await client.updateLink(ctx.input.linkId, {
      name: ctx.input.name,
      custom_fields: ctx.input.customFields
    });

    return {
      output: {
        linkId: link.id,
        name: link.name,
        type: link.type,
        externalUrl: link.external_url,
        customFields: link.custom_fields
      },
      message: `Updated link **${link.name || link.id}**.`
    };
  });
