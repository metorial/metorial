import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateMember = SlateTool.create(spec, {
  name: 'Update Member',
  key: 'update_member',
  description: `Updates an existing user's information in your Heartbeat community. Can update name, email, roles, groups, bio, social links, and other profile fields.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('ID of the user to update'),
      firstName: z.string().optional().describe('New first name'),
      lastName: z.string().optional().describe('New last name'),
      email: z.string().optional().describe('New email address'),
      roles: z.array(z.string()).optional().describe('Updated role IDs'),
      groups: z.array(z.string()).optional().describe('Updated group IDs'),
      profilePicture: z.string().optional().describe('Updated profile picture as a data URI'),
      bio: z.string().optional().describe('Updated biography'),
      status: z.string().optional().describe('Updated status message'),
      linkedin: z.string().optional().describe('Updated LinkedIn profile URL'),
      twitter: z.string().optional().describe('Updated Twitter profile URL'),
      instagram: z.string().optional().describe('Updated Instagram profile URL')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('ID of the updated user'),
      email: z.string().describe('Email of the updated user'),
      firstName: z.string().describe('First name of the updated user'),
      lastName: z.string().describe('Last name of the updated user')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let { userId, ...updateData } = ctx.input;
    let user = await client.updateUser(userId, updateData);

    return {
      output: {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      message: `Updated member **${user.firstName} ${user.lastName}** (${user.email}).`
    };
  })
  .build();
