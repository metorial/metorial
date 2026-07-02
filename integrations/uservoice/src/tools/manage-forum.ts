import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageForum = SlateTool.create(spec, {
  name: 'Manage Forum',
  key: 'manage_forum',
  description: `Create a new forum or update an existing one. Forums are distinct areas for collecting ideas on different topics or products. Provide a **forumId** to update, or omit it to create a new forum.`
})
  .input(
    z.object({
      forumId: z
        .number()
        .optional()
        .describe('ID of the forum to update. Omit to create a new forum.'),
      name: z.string().describe('Name of the forum'),
      welcomeMessage: z.string().optional().describe('Welcome message displayed to users'),
      prompt: z.string().optional().describe('Prompt text shown when submitting an idea'),
      isPublic: z.boolean().optional().describe('Whether the forum is publicly accessible')
    })
  )
  .output(
    z.object({
      forumId: z.number().describe('ID of the forum'),
      name: z.string().describe('Name of the forum'),
      isPublic: z.boolean().describe('Whether the forum is public'),
      createdAt: z.string().describe('When the forum was created'),
      updatedAt: z.string().describe('When the forum was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    let forum: any;
    let action: string;

    if (ctx.input.forumId) {
      forum = await client.updateForum(ctx.input.forumId, {
        name: ctx.input.name,
        welcomeMessage: ctx.input.welcomeMessage,
        prompt: ctx.input.prompt,
        isPublic: ctx.input.isPublic
      });
      action = 'Updated';
    } else {
      forum = await client.createForum({
        name: ctx.input.name,
        welcomeMessage: ctx.input.welcomeMessage,
        prompt: ctx.input.prompt,
        isPublic: ctx.input.isPublic
      });
      action = 'Created';
    }

    return {
      output: {
        forumId: forum.id,
        name: forum.name,
        isPublic: forum.is_public ?? true,
        createdAt: forum.created_at,
        updatedAt: forum.updated_at
      },
      message: `${action} forum **"${forum.name}"** (ID: ${forum.id}).`
    };
  })
  .build();
