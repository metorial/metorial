import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, timeCampCreatedId } from '../lib/client';
import { spec } from '../spec';

export let manageTag = SlateTool.create(spec, {
  name: 'Create or Update Tag',
  key: 'manage_tag',
  description: `Create a new tag or update an existing tag in TimeCamp. Tags are used to categorize time entries and tasks.`,
  instructions: [
    'Omit tagId and provide tagListId from list_tag_lists to create a new tag.',
    'Provide tagId to rename an existing tag.'
  ]
})
  .input(
    z.object({
      tagId: z.number().optional().describe('Tag ID to update. Omit to create a new tag.'),
      name: z.string().describe('Tag name'),
      tagListId: z
        .number()
        .optional()
        .describe(
          'Required when creating a tag. Call list_tag_lists to discover tag list IDs.'
        )
    })
  )
  .output(
    z.object({
      tagId: z.string().describe('ID of the created or updated tag')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.tagId !== undefined) {
      await client.updateTag(ctx.input.tagId, ctx.input.name);
      return {
        output: {
          tagId: String(ctx.input.tagId)
        },
        message: `Updated tag **${ctx.input.tagId}** to "${ctx.input.name}".`
      };
    } else {
      let result = await client.createTag(ctx.input.name, ctx.input.tagListId);
      let tagId = timeCampCreatedId(result, ['tag_id', 'id'], 'tag');
      return {
        output: {
          tagId
        },
        message: `Created tag **"${ctx.input.name}"** with ID ${tagId}.`
      };
    }
  })
  .build();
