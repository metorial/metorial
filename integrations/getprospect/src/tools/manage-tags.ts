import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let tagSchema = z.object({
  tagId: z.string().optional().describe('Unique identifier for the tag'),
  name: z.string().optional().describe('Tag name')
});

export let listTags = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
  description: `Retrieve all tags in your GetProspect account. Tags are used to organize and categorize leads and other records.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      tags: z.array(tagSchema).describe('List of all tags')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getTags();
    let tagsData = result.data ?? result.tags ?? result ?? [];
    let tagsArray = Array.isArray(tagsData) ? tagsData : [];

    return {
      output: {
        tags: tagsArray.map((tag: any) => ({
          tagId: tag.id ?? tag.tag_id,
          name: tag.name
        }))
      },
      message: `Found **${tagsArray.length}** tag(s).`
    };
  })
  .build();

export let createTag = SlateTool.create(spec, {
  name: 'Create Tag',
  key: 'create_tag',
  description: `Create a new tag for organizing and categorizing leads and records in GetProspect.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new tag')
    })
  )
  .output(tagSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createTag({ name: ctx.input.name });

    return {
      output: {
        tagId: result.id ?? result.tag_id,
        name: result.name ?? ctx.input.name
      },
      message: `Created tag **${ctx.input.name}**.`
    };
  })
  .build();

export let updateTag = SlateTool.create(spec, {
  name: 'Update Tag',
  key: 'update_tag',
  description: `Rename an existing tag in GetProspect.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      tagId: z.string().describe('ID of the tag to update'),
      name: z.string().describe('New name for the tag')
    })
  )
  .output(tagSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.updateTag(ctx.input.tagId, { name: ctx.input.name });

    return {
      output: {
        tagId: result.id ?? result.tag_id ?? ctx.input.tagId,
        name: result.name ?? ctx.input.name
      },
      message: `Updated tag **${ctx.input.tagId}** to "${ctx.input.name}".`
    };
  })
  .build();

export let deleteTag = SlateTool.create(spec, {
  name: 'Delete Tag',
  key: 'delete_tag',
  description: `Permanently delete a tag from GetProspect. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      tagId: z.string().describe('ID of the tag to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteTag(ctx.input.tagId);

    return {
      output: { success: true },
      message: `Deleted tag **${ctx.input.tagId}**.`
    };
  })
  .build();
