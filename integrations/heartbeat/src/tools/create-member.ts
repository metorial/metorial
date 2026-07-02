import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createMember = SlateTool.create(spec, {
  name: 'Create Member',
  key: 'create_member',
  description: `Creates a new user in your Heartbeat community. Optionally assign groups, set a profile picture, bio, social links, and trigger an introduction thread.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address for the new user'),
      firstName: z.string().optional().describe('First name of the user'),
      lastName: z.string().optional().describe('Last name of the user'),
      roles: z.array(z.string()).optional().describe('Role IDs to assign to the user'),
      groups: z.array(z.string()).optional().describe('Group IDs to add the user to'),
      profilePicture: z
        .string()
        .optional()
        .describe('Profile picture as a data URI (JPG, GIF, or PNG)'),
      bio: z.string().optional().describe('Short biography for the user'),
      status: z.string().optional().describe('Status message for the user'),
      linkedin: z.string().optional().describe('LinkedIn profile URL'),
      twitter: z.string().optional().describe('Twitter profile URL'),
      instagram: z.string().optional().describe('Instagram profile URL'),
      createIntroductionThread: z
        .boolean()
        .optional()
        .describe('If true and bio is provided, creates an introduction thread for the user')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('ID of the created user'),
      email: z.string().describe('Email of the created user'),
      firstName: z.string().describe('First name of the created user'),
      lastName: z.string().describe('Last name of the created user'),
      createdAt: z.string().describe('Timestamp when the user was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let user = await client.createUser({
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      roles: ctx.input.roles,
      groups: ctx.input.groups,
      profilePicture: ctx.input.profilePicture,
      bio: ctx.input.bio,
      status: ctx.input.status,
      linkedin: ctx.input.linkedin,
      twitter: ctx.input.twitter,
      instagram: ctx.input.instagram,
      createIntroductionThread: ctx.input.createIntroductionThread
    });

    return {
      output: {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt
      },
      message: `Created member **${user.firstName} ${user.lastName}** (${user.email}) in the community.`
    };
  })
  .build();
