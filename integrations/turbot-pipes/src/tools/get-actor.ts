import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getActor = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_actor',
  description: `Retrieve information about the currently authenticated user (actor), including their handle, display name, and email.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('User identifier'),
      handle: z.string().describe('User handle'),
      displayName: z.string().optional().describe('Display name'),
      email: z.string().optional().describe('Email address'),
      avatarUrl: z.string().optional().describe('Avatar URL'),
      status: z.string().optional().describe('Account status'),
      createdAt: z.string().optional().describe('Account creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let actor = await client.getActor();

    return {
      output: {
        userId: actor.id,
        handle: actor.handle,
        displayName: actor.displayName,
        email: actor.email,
        avatarUrl: actor.avatarUrl,
        status: actor.status,
        createdAt: actor.createdAt
      },
      message: `Authenticated as **${actor.displayName || actor.handle}** (${actor.handle}).`
    };
  })
  .build();
