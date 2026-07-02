import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let tagOutputSchema = z.object({
  tagId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  highlight: z.string().optional(),
  isPrivate: z.boolean()
});

export let listTags = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
  description: `List all tags in Front at the company level. Tags are used to classify and organize conversations.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      pageToken: z.string().optional().describe('Pagination token'),
      limit: z.number().optional().describe('Maximum number of results')
    })
  )
  .output(
    z.object({
      tags: z.array(tagOutputSchema),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listTags({
      page_token: ctx.input.pageToken,
      limit: ctx.input.limit
    });

    let resultTags = result._results.map(t => ({
      tagId: t.id,
      name: t.name,
      description: t.description,
      highlight: t.highlight,
      isPrivate: t.is_private
    }));

    return {
      output: { tags: resultTags, nextPageToken: result._pagination?.next || undefined },
      message: `Found **${resultTags.length}** tags.`
    };
  });

export let createTag = SlateTool.create(spec, {
  name: 'Create Tag',
  key: 'create_tag',
  description: `Create a new tag at the company level. Optionally create it as a child of an existing parent tag for hierarchical organization.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Tag name'),
      description: z.string().optional().describe('Tag description'),
      highlight: z.string().optional().describe('Tag highlight color'),
      parentTagId: z.string().optional().describe('Parent tag ID for creating a child tag')
    })
  )
  .output(tagOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let tag: any;
    if (ctx.input.parentTagId) {
      tag = await client.createChildTag(ctx.input.parentTagId, {
        name: ctx.input.name,
        description: ctx.input.description,
        highlight: ctx.input.highlight
      });
    } else {
      tag = await client.createTag({
        name: ctx.input.name,
        description: ctx.input.description,
        highlight: ctx.input.highlight
      });
    }

    return {
      output: {
        tagId: tag.id,
        name: tag.name,
        description: tag.description,
        highlight: tag.highlight,
        isPrivate: tag.is_private
      },
      message: `Created tag **${tag.name}**${ctx.input.parentTagId ? ` as child of ${ctx.input.parentTagId}` : ''}.`
    };
  });

export let updateTag = SlateTool.create(spec, {
  name: 'Update Tag',
  key: 'update_tag',
  description: `Update an existing tag's name, description, or highlight color.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      tagId: z.string().describe('ID of the tag to update'),
      name: z.string().optional().describe('Updated tag name'),
      description: z.string().optional().describe('Updated description'),
      highlight: z.string().optional().describe('Updated highlight color')
    })
  )
  .output(tagOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let tag = await client.updateTag(ctx.input.tagId, {
      name: ctx.input.name,
      description: ctx.input.description,
      highlight: ctx.input.highlight
    });

    return {
      output: {
        tagId: tag.id,
        name: tag.name,
        description: tag.description,
        highlight: tag.highlight,
        isPrivate: tag.is_private
      },
      message: `Updated tag **${tag.name}**.`
    };
  });

export let deleteTag = SlateTool.create(spec, {
  name: 'Delete Tag',
  key: 'delete_tag',
  description: `Permanently delete a tag from Front. This will remove the tag from all conversations. Cannot be undone.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      tagId: z.string().describe('ID of the tag to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteTag(ctx.input.tagId);

    return {
      output: { deleted: true },
      message: `Deleted tag ${ctx.input.tagId}.`
    };
  });
