import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageProfile = SlateTool.create(spec, {
  name: 'Manage Profile',
  key: 'manage_profile',
  description: `Create, update, or delete a DNS filtering profile. Profiles are collections of rules and settings enforced on DNS resolvers. You can create blank profiles or clone existing ones. Updates support renaming, disabling until a specific time, and locking/unlocking.`,
  instructions: [
    'To create a profile, provide the "name" field and set operation to "create".',
    'To update, provide "profileId" and the fields you want to change.',
    'To delete, provide "profileId" and set operation to "delete". Profile must not be enforced on any device.'
  ]
})
  .input(
    z.object({
      operation: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      profileId: z.string().optional().describe('Profile ID (required for update and delete)'),
      name: z
        .string()
        .optional()
        .describe('Profile name (required for create, optional for update)'),
      cloneProfileId: z.string().optional().describe('Profile ID to clone when creating'),
      disableTtl: z
        .number()
        .optional()
        .describe('Unix timestamp to disable profile until. Set to 0 to re-enable.'),
      lockStatus: z.number().optional().describe('1 to lock, 0 to unlock'),
      lockMessage: z
        .string()
        .optional()
        .describe('Message shown when locked profile is modified')
    })
  )
  .output(
    z.object({
      profileId: z.string().describe('Profile ID'),
      name: z.string().describe('Profile name'),
      updated: z.number().describe('Last updated timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { operation, profileId, name, cloneProfileId, disableTtl, lockStatus, lockMessage } =
      ctx.input;

    if (operation === 'create') {
      if (!name) throw new Error('Name is required when creating a profile');
      let profile = await client.createProfile({ name, cloneProfileId });
      return {
        output: { profileId: profile.PK, name: profile.name, updated: profile.updated },
        message: `Created profile **${profile.name}** (${profile.PK})${cloneProfileId ? ` cloned from ${cloneProfileId}` : ''}.`
      };
    }

    if (!profileId) throw new Error('Profile ID is required for update and delete operations');

    if (operation === 'delete') {
      await client.deleteProfile(profileId);
      return {
        output: { profileId, name: '', updated: 0 },
        message: `Deleted profile **${profileId}**.`
      };
    }

    let profile = await client.modifyProfile(profileId, {
      name,
      disableTtl,
      lockStatus,
      lockMessage
    });
    return {
      output: { profileId: profile.PK, name: profile.name, updated: profile.updated },
      message: `Updated profile **${profile.name}** (${profile.PK}).`
    };
  })
  .build();
