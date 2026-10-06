import { SlateTool } from 'slates';
import { z } from 'zod';
import { DuoClient } from '../lib/client';
import { requireValue, validateInput } from '../lib/contracts';
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
      phonesRemoved: z.number().optional(),
      confirmed: z.boolean().optional(),
      partial: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    validateInput('update_user', ctx.input, [ctx.auth.secretKey]);
    let client = new DuoClient({
      integrationKey: ctx.auth.integrationKey,
      secretKey: ctx.auth.secretKey,
      apiHostname: ctx.auth.apiHostname,
      signingVersion: ctx.auth.signingVersion
    });

    let profileUpdates: Record<string, any> = {};
    if (ctx.input.username !== undefined) profileUpdates.username = ctx.input.username;
    if (ctx.input.email !== undefined) profileUpdates.email = ctx.input.email;
    if (ctx.input.realname !== undefined) profileUpdates.realname = ctx.input.realname;
    if (ctx.input.firstname !== undefined) profileUpdates.firstname = ctx.input.firstname;
    if (ctx.input.lastname !== undefined) profileUpdates.lastname = ctx.input.lastname;
    if (ctx.input.status !== undefined) profileUpdates.status = ctx.input.status;
    if (ctx.input.notes !== undefined) profileUpdates.notes = ctx.input.notes;

    requireValue(
      Object.keys(profileUpdates).length > 0 ||
        ['addGroupIds', 'removeGroupIds', 'addPhoneIds', 'removePhoneIds'].some(
          key => (ctx.input as Record<string, unknown>)[key] !== undefined
        ),
      'Provide profile fields or explicit relationship changes.'
    );
    let user = (await client.getUser(ctx.input.userId)).response;
    for (const id of [...(ctx.input.addGroupIds ?? []), ...(ctx.input.removeGroupIds ?? [])])
      await client.getGroup(id);
    for (const id of [...(ctx.input.addPhoneIds ?? []), ...(ctx.input.removePhoneIds ?? [])])
      await client.getPhone(id);
    let groupsAdded = 0,
      groupsRemoved = 0,
      phonesAdded = 0,
      phonesRemoved = 0,
      partial = false,
      confirmed = false;
    try {
      if (Object.keys(profileUpdates).length > 0)
        user = (await client.updateUser(ctx.input.userId, profileUpdates)).response;
      for (const id of ctx.input.addGroupIds ?? []) {
        await client.associateUserGroup(ctx.input.userId, id);
        groupsAdded++;
      }
      for (const id of ctx.input.removeGroupIds ?? []) {
        await client.disassociateUserGroup(ctx.input.userId, id);
        groupsRemoved++;
      }
      for (const id of ctx.input.addPhoneIds ?? []) {
        await client.associateUserPhone(ctx.input.userId, id);
        phonesAdded++;
      }
      for (const id of ctx.input.removePhoneIds ?? []) {
        await client.disassociateUserPhone(ctx.input.userId, id);
        phonesRemoved++;
      }
      user = (await client.getUser(ctx.input.userId)).response;
      confirmed =
        Object.entries(profileUpdates).every(([key, value]) => user[key] === value) &&
        (ctx.input.addGroupIds ?? []).every(id =>
          user.groups?.some((g: { group_id: string }) => g.group_id === id)
        ) &&
        (ctx.input.removeGroupIds ?? []).every(
          id =>
            Array.isArray(user.groups) &&
            !user.groups.some((g: { group_id: string }) => g.group_id === id)
        ) &&
        (ctx.input.addPhoneIds ?? []).every(id =>
          user.phones?.some((p: { phone_id: string }) => p.phone_id === id)
        ) &&
        (ctx.input.removePhoneIds ?? []).every(
          id =>
            Array.isArray(user.phones) &&
            !user.phones.some((p: { phone_id: string }) => p.phone_id === id)
        );
    } catch {
      partial = true;
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
        phonesRemoved: phonesRemoved > 0 ? phonesRemoved : undefined,
        confirmed,
        partial
      },
      message: confirmed
        ? `Confirmed user update **${user.username}** (${user.user_id}).`
        : `User ${ctx.input.userId} update is unconfirmed${partial ? ' after a request failed' : ''}. Earlier steps may already have succeeded; read the user and reconcile profile/relationship state before retrying. No rollback occurred.`
    };
  })
  .build();
