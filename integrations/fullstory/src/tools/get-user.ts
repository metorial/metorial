import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve a user's profile from FullStory by their FullStory user ID. Returns the full user profile including custom properties and the link to view them in FullStory.`,
  constraints: ['Requires an Admin or Architect API key to view user data.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('FullStory-generated user ID')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('FullStory-generated user ID'),
      uid: z.string().optional().describe("Your application's user ID"),
      displayName: z.string().optional().describe('Display name'),
      email: z.string().optional().describe('Email address'),
      isBeingDeleted: z.boolean().optional().describe('Whether the user is being deleted'),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom properties on the user profile'),
      appUrl: z.string().optional().describe('URL to view this user in the FullStory app')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let user = await client.getUser(ctx.input.userId);

    return {
      output: {
        userId: user.userId,
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        isBeingDeleted: user.isBeingDeleted,
        properties: user.properties,
        appUrl: user.appUrl
      },
      message: `Retrieved user **${user.displayName || user.uid || user.userId}**.`
    };
  })
  .build();
