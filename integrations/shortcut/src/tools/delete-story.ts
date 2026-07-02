import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteStory = SlateTool.create(spec, {
  name: 'Delete Story',
  key: 'delete_story',
  description: `Permanently deletes a story by its public ID. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      storyId: z.number().describe('Public ID of the story to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the story was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteStory(ctx.input.storyId);

    return {
      output: {
        deleted: true
      },
      message: `Deleted story with ID ${ctx.input.storyId}`
    };
  })
  .build();
