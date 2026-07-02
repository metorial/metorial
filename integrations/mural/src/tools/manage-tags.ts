import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let tagOutputSchema = z.object({
  tagId: z.string(),
  text: z.string(),
  color: z.string().optional()
});

export let listTagsTool = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
  description: `List all tags in a mural. Tags are used to organize and categorize widgets on the canvas.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      muralId: z.string().describe('ID of the mural to list tags from')
    })
  )
  .output(
    z.object({
      tags: z.array(tagOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listTags(ctx.input.muralId);

    let tags = result.value.map(t => ({
      tagId: t.id,
      text: t.text,
      color: t.color
    }));

    return {
      output: { tags },
      message: `Found **${tags.length}** tag(s).`
    };
  })
  .build();

export let createTagTool = SlateTool.create(spec, {
  name: 'Create Tag',
  key: 'create_tag',
  description: `Create a new tag in a mural for categorizing widgets.`,
  constraints: ['Tag text is limited to 25 characters.']
})
  .input(
    z.object({
      muralId: z.string().describe('ID of the mural to create the tag in'),
      text: z.string().describe('Tag text (max 25 characters)'),
      color: z.string().optional().describe('Tag color')
    })
  )
  .output(tagOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let t = await client.createTag(ctx.input.muralId, {
      text: ctx.input.text,
      color: ctx.input.color
    });

    return {
      output: { tagId: t.id, text: t.text, color: t.color },
      message: `Created tag **${t.text}**.`
    };
  })
  .build();

export let updateTagTool = SlateTool.create(spec, {
  name: 'Update Tag',
  key: 'update_tag',
  description: `Update an existing tag's text or color.`
})
  .input(
    z.object({
      muralId: z.string().describe('ID of the mural containing the tag'),
      tagId: z.string().describe('ID of the tag to update'),
      text: z.string().optional().describe('New tag text (max 25 characters)'),
      color: z.string().optional().describe('New tag color')
    })
  )
  .output(tagOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let t = await client.updateTag(ctx.input.muralId, ctx.input.tagId, {
      text: ctx.input.text,
      color: ctx.input.color
    });

    return {
      output: { tagId: t.id, text: t.text, color: t.color },
      message: `Updated tag **${t.text}**.`
    };
  })
  .build();

export let deleteTagTool = SlateTool.create(spec, {
  name: 'Delete Tag',
  key: 'delete_tag',
  description: `Delete a tag from a mural.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      muralId: z.string().describe('ID of the mural containing the tag'),
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
    await client.deleteTag(ctx.input.muralId, ctx.input.tagId);

    return {
      output: { deleted: true },
      message: `Deleted tag **${ctx.input.tagId}**.`
    };
  })
  .build();
