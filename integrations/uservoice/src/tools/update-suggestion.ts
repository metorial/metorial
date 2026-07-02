import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateSuggestion = SlateTool.create(spec, {
  name: 'Update Suggestion',
  key: 'update_suggestion',
  description: `Update an existing suggestion's title, body, category, labels, or status. Only the fields you provide will be updated.`
})
  .input(
    z.object({
      suggestionId: z.number().describe('ID of the suggestion to update'),
      title: z.string().optional().describe('New title'),
      body: z.string().optional().describe('New body/description'),
      categoryId: z
        .number()
        .nullable()
        .optional()
        .describe('New category ID (null to remove)'),
      labelIds: z
        .array(z.number())
        .optional()
        .describe('New label IDs (replaces existing labels)'),
      statusId: z.number().optional().describe('New status ID')
    })
  )
  .output(
    z.object({
      suggestionId: z.number().describe('ID of the updated suggestion'),
      title: z.string().describe('Updated title'),
      state: z.string().describe('Current state'),
      updatedAt: z.string().describe('When the suggestion was last updated'),
      links: z.record(z.string(), z.any()).optional().describe('Associated resource links')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    let s = await client.updateSuggestion(ctx.input.suggestionId, {
      title: ctx.input.title,
      body: ctx.input.body,
      categoryId: ctx.input.categoryId,
      labelIds: ctx.input.labelIds,
      statusId: ctx.input.statusId
    });

    return {
      output: {
        suggestionId: s.id,
        title: s.title,
        state: s.state,
        updatedAt: s.updated_at,
        links: s.links
      },
      message: `Updated suggestion **"${s.title}"** (ID: ${s.id}).`
    };
  })
  .build();
