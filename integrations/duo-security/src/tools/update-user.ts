import { SlateTool } from 'slates';
import { z } from 'zod';
import { DuoClient } from '../lib/client';
import { spec } from '../spec';

export let updateUser = SlateTool.create(spec, {
  name: 'Update User',
  key: 'update_user',
  description: `Update a Duo Security user's profile, status, group memberships, or phone associations. Supports modifying user fields, adding/removing groups, and associating/disassociating phones in a single operation.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('The Duo user ID to update'),
      username: z.string().optional().describe('New username'),
      email: z.string().optional().describe('New email address'),
      realname: z.string().optional().describe('New full name'),
      firstname: z.string().optional().describe('New first name'),
      lastname: z.string().optional().describe('New last name'),
      status: z.enum(['active', 'bypass', 'disabled']).optional().describe('New user status'),
      notes: z.string().optional().describe('New notes'),
      addGroupIds: z.array(z.string()).optional().describe('Group IDs to add the user to'),
      removeGroupIds: z
        .array(z.string())
        .optional()
        .describe('Group IDs to remove the user from'),
      addPhoneIds: z
        .array(z.string())
        .optional()
        .describe('Phone IDs to associate with the user'),
      removePhoneIds: z
        .array(z.string())
        .optional()
        .describe('Phone IDs to disassociate from the user')
    })
  )
  .output(
    z.object({
      userId: z.string(),
      username: z.string(),
      email: z.string().optional(),
      status: z.string(),
      groupsAdded: z.number().optional(),
      groupsRemoved: z.number().optional(),
      phonesAdded: z.number().optional(),
      phonesRemoved: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new DuoClient({
      integrationKey: ctx.auth.integrationKey,
      secretKey: ctx.auth.secretKey,
      apiHostname: ctx.auth.apiHostname
    });

    let profileUpdates: Record<string, any> = {};
    if (ctx.input.username) profileUpdates.username = ctx.input.username;
    if (ctx.input.email) profileUpdates.email = ctx.input.email;
    if (ctx.input.realname) profileUpdates.realname = ctx.input.realname;
    if (ctx.input.firstname) profileUpdates.firstname = ctx.input.firstname;
    if (ctx.input.lastname) profileUpdates.lastname = ctx.input.lastname;
    if (ctx.input.status) profileUpdates.status = ctx.input.status;
    if (ctx.input.notes !== undefined) profileUpdates.notes = ctx.input.notes;

    let user: any;
    if (Object.keys(profileUpdates).length > 0) {
      let result = await client.updateUser(ctx.input.userId, profileUpdates);
      user = result.response;
    } else {
      let result = await client.getUser(ctx.input.userId);
      user = result.response;
    }

    let groupsAdded = 0;
    let groupsRemoved = 0;
    let phonesAdded = 0;
    let phonesRemoved = 0;

    if (ctx.input.addGroupIds) {
      for (let groupId of ctx.input.addGroupIds) {
        await client.associateUserGroup(ctx.input.userId, groupId);
        groupsAdded++;
      }
    }

    if (ctx.input.removeGroupIds) {
      for (let groupId of ctx.input.removeGroupIds) {
        await client.disassociateUserGroup(ctx.input.userId, groupId);
        groupsRemoved++;
      }
    }

    if (ctx.input.addPhoneIds) {
      for (let phoneId of ctx.input.addPhoneIds) {
        await client.associateUserPhone(ctx.input.userId, phoneId);
        phonesAdded++;
      }
    }

    if (ctx.input.removePhoneIds) {
      for (let phoneId of ctx.input.removePhoneIds) {
        await client.disassociateUserPhone(ctx.input.userId, phoneId);
        phonesRemoved++;
      }
    }

    return {
      output: {
        userId: user.user_id,
        username: user.username,
        email: user.email || undefined,
        status: user.status,
        groupsAdded: groupsAdded > 0 ? groupsAdded : undefined,
        groupsRemoved: groupsRemoved > 0 ? groupsRemoved : undefined,
        phonesAdded: phonesAdded > 0 ? phonesAdded : undefined,
        phonesRemoved: phonesRemoved > 0 ? phonesRemoved : undefined
      },
      message: `Updated user **${user.username}**.`
    };
  })
  .build();
