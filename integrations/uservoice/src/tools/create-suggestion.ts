import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createSuggestion = SlateTool.create(spec, {
  name: 'Create Suggestion',
  key: 'create_suggestion',
  description: `Create a new suggestion (idea) in a UserVoice forum. Requires a title and forum ID. Optionally assign a category and labels.`
})
  .input(
    z.object({
      title: z.string().describe('Title of the new suggestion'),
      body: z.string().optional().describe('Detailed description of the suggestion'),
      forumId: z.number().describe('ID of the forum to create the suggestion in'),
      categoryId: z.number().optional().describe('ID of the category to assign'),
      labelIds: z.array(z.number()).optional().describe('IDs of labels to attach')
    })
  )
  .output(
    z.object({
      suggestionId: z.number().describe('ID of the newly created suggestion'),
      title: z.string().describe('Title of the created suggestion'),
      state: z.string().describe('State of the created suggestion'),
      createdAt: z.string().describe('When the suggestion was created'),
      links: z.record(z.string(), z.any()).optional().describe('Associated resource links')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    let s = await client.createSuggestion({
      title: ctx.input.title,
      body: ctx.input.body,
      forumId: ctx.input.forumId,
      categoryId: ctx.input.categoryId,
      labelIds: ctx.input.labelIds
    });

    return {
      output: {
        suggestionId: s.id,
        title: s.title,
        state: s.state,
        createdAt: s.created_at,
        links: s.links
      },
      message: `Created suggestion **"${s.title}"** (ID: ${s.id}) in forum ${ctx.input.forumId}.`
    };
  })
  .build();
