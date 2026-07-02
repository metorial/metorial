import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteSuggestion = SlateTool.create(spec, {
  name: 'Delete Suggestion',
  key: 'delete_suggestion',
  description: `Permanently delete a suggestion (idea) from UserVoice. This action cannot be undone.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      suggestionId: z.number().describe('ID of the suggestion to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the suggestion was successfully deleted'),
      suggestionId: z.number().describe('ID of the deleted suggestion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    await client.deleteSuggestion(ctx.input.suggestionId);

    return {
      output: {
        deleted: true,
        suggestionId: ctx.input.suggestionId
      },
      message: `Deleted suggestion ID: ${ctx.input.suggestionId}.`
    };
  })
  .build();
