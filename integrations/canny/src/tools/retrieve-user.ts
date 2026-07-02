import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let retrieveUserTool = SlateTool.create(spec, {
  name: 'Retrieve User',
  key: 'retrieve_user',
  description: `Retrieve a user's details by their Canny ID, your application's user ID, or email address. Provide exactly one identifier.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cannyUserId: z.string().optional().describe('Canny-internal user ID'),
      userId: z.string().optional().describe("Your application's unique user ID"),
      email: z.string().optional().describe('User email address')
    })
  )
  .output(
    z.object({
      cannyUserId: z.string().describe('Canny-internal user ID'),
      userId: z.string().nullable().describe("Your application's user ID"),
      name: z.string().describe('User full name'),
      email: z.string().nullable().describe('User email'),
      isAdmin: z.boolean().describe('Whether the user is an admin'),
      url: z.string().describe('User profile URL'),
      created: z.string().describe('Account creation timestamp'),
      avatarURL: z.string().nullable().describe('Avatar image URL'),
      customFields: z.record(z.string(), z.any()).optional().describe('Custom field values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    let u = await client.retrieveUser({
      id: ctx.input.cannyUserId,
      userID: ctx.input.userId,
      email: ctx.input.email
    });

    return {
      output: {
        cannyUserId: u.id,
        userId: u.userID || null,
        name: u.name,
        email: u.email || null,
        isAdmin: u.isAdmin,
        url: u.url,
        created: u.created,
        avatarURL: u.avatarURL || null,
        customFields: u.customFields
      },
      message: `Retrieved user **${u.name}** (${u.email || 'no email'}).`
    };
  })
  .build();
