import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createOrUpdateUser = SlateTool.create(spec, {
  name: 'Create or Update User',
  key: 'create_or_update_user',
  description: `Create a new user or update an existing user in FullStory. This is an upsert operation: if a user with the given **uid** already exists, their profile will be updated; otherwise a new user is created.
Attach custom properties to enrich user profiles for segmentation and analysis.`,
  instructions: [
    'Provide a uid to identify the user in your system. If a user with that uid already exists, they will be updated.',
    'Custom properties can include strings, numbers, booleans, and dates (as ISO 8601 strings).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      uid: z
        .string()
        .optional()
        .describe(
          "Your application's unique identifier for this user (max 256 chars). Used for upsert matching."
        ),
      displayName: z.string().optional().describe('Display name for the user (max 256 chars)'),
      email: z.string().optional().describe('Email address for the user (max 128 chars)'),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom properties to set on the user profile (up to 500 unique properties)')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('FullStory-generated user ID'),
      uid: z.string().optional().describe("Your application's user ID"),
      displayName: z.string().optional().describe('Display name'),
      email: z.string().optional().describe('Email address'),
      appUrl: z.string().optional().describe('URL to view this user in the FullStory app')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let user = await client.createOrUpdateUser({
      uid: ctx.input.uid,
      displayName: ctx.input.displayName,
      email: ctx.input.email,
      properties: ctx.input.properties
    });

    return {
      output: {
        userId: user.userId,
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        appUrl: user.appUrl
      },
      message: `User **${user.displayName || user.uid || user.userId}** has been ${ctx.input.uid ? 'created or updated' : 'created'}.`
    };
  })
  .build();
