import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTags = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
  description: `List all tags in Salesflare. Returns tag names, IDs, and usage counts across accounts, contacts, and opportunities.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search tags by name'),
      limit: z.number().optional().default(20).describe('Max results to return'),
      offset: z.number().optional().default(0).describe('Pagination offset')
    })
  )
  .output(
    z.object({
      tags: z
        .array(
          z.object({
            tagId: z.number().describe('Tag ID'),
            name: z.string().describe('Tag name'),
            accountCount: z.number().optional().describe('Number of accounts with this tag'),
            contactCount: z.number().optional().describe('Number of contacts with this tag'),
            opportunityCount: z
              .number()
              .optional()
              .describe('Number of opportunities with this tag')
          })
        )
        .describe('List of tags'),
      count: z.number().describe('Number of tags returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let params: Record<string, any> = {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    };
    if (ctx.input.search) params.q = JSON.stringify({ search: ctx.input.search });

    let tags = await client.listTags(params);
    let list = Array.isArray(tags) ? tags : [];

    let mapped = list.map((t: any) => ({
      tagId: t.id,
      name: t.name,
      accountCount: t.account_count,
      contactCount: t.person_count,
      opportunityCount: t.opportunity_count
    }));

    return {
      output: {
        tags: mapped,
        count: mapped.length
      },
      message: `Found **${mapped.length}** tag(s).`
    };
  })
  .build();

export let createTag = SlateTool.create(spec, {
  name: 'Create Tag',
  key: 'create_tag',
  description: `Create a new tag in Salesflare. Tags can be assigned to accounts, contacts, and opportunities.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Tag name to create')
    })
  )
  .output(
    z.object({
      tagId: z.number().describe('ID of the created tag')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.createTag(ctx.input.name);

    return {
      output: { tagId: result.id },
      message: `Created tag **"${ctx.input.name}"** (ID: ${result.id}).`
    };
  })
  .build();

export let updateTag = SlateTool.create(spec, {
  name: 'Update Tag',
  key: 'update_tag',
  description: `Rename an existing tag in Salesflare.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      tagId: z.number().describe('ID of the tag to update'),
      name: z.string().describe('New tag name')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.updateTag(ctx.input.tagId, ctx.input.name);

    return {
      output: { success: true },
      message: `Renamed tag **${ctx.input.tagId}** to **"${ctx.input.name}"**.`
    };
  })
  .build();

export let deleteTag = SlateTool.create(spec, {
  name: 'Delete Tag',
  key: 'delete_tag',
  description: `Delete a tag from Salesflare. This removes the tag from all accounts, contacts, and opportunities.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      tagId: z.number().describe('ID of the tag to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.deleteTag(ctx.input.tagId);

    return {
      output: { success: true },
      message: `Deleted tag **${ctx.input.tagId}**.`
    };
  })
  .build();
