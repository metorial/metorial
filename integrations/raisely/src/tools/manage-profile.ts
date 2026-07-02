import { SlateTool } from 'slates';
import { z } from 'zod';
import { RaiselyClient } from '../lib/client';
import { spec } from '../spec';

export let manageProfile = SlateTool.create(spec, {
  name: 'Manage Profile',
  key: 'manage_profile',
  description: `Create, update, or delete a fundraising profile (page) in a campaign. Profiles can be individual fundraising pages or team pages. Supports setting goals, descriptions, and custom fields. Can also add or remove team members.`,
  instructions: [
    'To create a profile, provide campaignUuid and the profile data. A userUuid is required for individual profiles.',
    'To update a profile, provide profileUuid and the fields to update.',
    'To delete a profile, set action to "delete" and provide profileUuid.',
    'To add/remove team members, set action to "add_member" or "remove_member".'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'add_member', 'remove_member'])
        .describe('Action to perform on the profile'),
      campaignUuid: z.string().optional().describe('Campaign UUID (required for create)'),
      profileUuid: z
        .string()
        .optional()
        .describe('Profile UUID (required for update, delete, add_member, remove_member)'),
      userUuid: z
        .string()
        .optional()
        .describe('User UUID for the profile owner or member to add/remove'),
      name: z.string().optional().describe('Profile display name'),
      description: z.string().optional().describe('Profile description/story'),
      goal: z.number().optional().describe('Fundraising goal amount in cents'),
      currency: z.string().optional().describe('Currency code (e.g. "AUD", "USD")'),
      type: z.enum(['individual', 'team', 'group']).optional().describe('Profile type'),
      parentUuid: z.string().optional().describe('Parent profile UUID (for joining a team)'),
      photoUrl: z.string().optional().describe('URL for the profile photo'),
      isActive: z.boolean().optional().describe('Whether the profile is active'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values (public and private)')
    })
  )
  .output(
    z.object({
      profile: z
        .record(z.string(), z.any())
        .optional()
        .describe('The created/updated profile object'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RaiselyClient({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.campaignUuid) {
        throw new Error('campaignUuid is required for creating a profile');
      }
      let data: Record<string, any> = {};
      if (ctx.input.name) data.name = ctx.input.name;
      if (ctx.input.description) data.description = ctx.input.description;
      if (ctx.input.goal !== undefined) data.goal = ctx.input.goal;
      if (ctx.input.currency) data.currency = ctx.input.currency;
      if (ctx.input.type) data.type = ctx.input.type;
      if (ctx.input.userUuid) data.userUuid = ctx.input.userUuid;
      if (ctx.input.parentUuid) data.parentUuid = ctx.input.parentUuid;
      if (ctx.input.photoUrl) data.photoUrl = ctx.input.photoUrl;
      if (ctx.input.isActive !== undefined) data.isActive = ctx.input.isActive;
      if (ctx.input.customFields) {
        data.public = ctx.input.customFields;
      }

      let result = await client.createProfile(ctx.input.campaignUuid, data);
      let profile = result.data || result;
      return {
        output: { profile, success: true },
        message: `Created profile **${profile.name || 'New Profile'}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.profileUuid) {
        throw new Error('profileUuid is required for updating a profile');
      }
      let data: Record<string, any> = {};
      if (ctx.input.name) data.name = ctx.input.name;
      if (ctx.input.description) data.description = ctx.input.description;
      if (ctx.input.goal !== undefined) data.goal = ctx.input.goal;
      if (ctx.input.currency) data.currency = ctx.input.currency;
      if (ctx.input.photoUrl) data.photoUrl = ctx.input.photoUrl;
      if (ctx.input.isActive !== undefined) data.isActive = ctx.input.isActive;
      if (ctx.input.parentUuid) data.parentUuid = ctx.input.parentUuid;
      if (ctx.input.customFields) {
        data.public = ctx.input.customFields;
      }

      let result = await client.updateProfile(ctx.input.profileUuid, data);
      let profile = result.data || result;
      return {
        output: { profile, success: true },
        message: `Updated profile **${profile.name || ctx.input.profileUuid}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.profileUuid) {
        throw new Error('profileUuid is required for deleting a profile');
      }
      await client.deleteProfile(ctx.input.profileUuid);
      return {
        output: { success: true },
        message: `Deleted profile **${ctx.input.profileUuid}**.`
      };
    }

    if (action === 'add_member') {
      if (!ctx.input.profileUuid || !ctx.input.userUuid) {
        throw new Error('profileUuid and userUuid are required for adding a member');
      }
      let result = await client.addProfileMember(ctx.input.profileUuid, ctx.input.userUuid);
      let profile = result.data || result;
      return {
        output: { profile, success: true },
        message: `Added member **${ctx.input.userUuid}** to profile **${ctx.input.profileUuid}**.`
      };
    }

    if (action === 'remove_member') {
      if (!ctx.input.profileUuid || !ctx.input.userUuid) {
        throw new Error('profileUuid and userUuid are required for removing a member');
      }
      await client.removeProfileMember(ctx.input.profileUuid, ctx.input.userUuid);
      return {
        output: { success: true },
        message: `Removed member **${ctx.input.userUuid}** from profile **${ctx.input.profileUuid}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
