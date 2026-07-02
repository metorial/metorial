import { SlateTool } from 'slates';
import { z } from 'zod';
import { HyperbrowserClient } from '../lib/client';
import { profileSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createProfile = SlateTool.create(spec, {
  name: 'Create Profile',
  key: 'create_profile',
  description: `Create a new browser profile for persisting login state, cookies, and browser data across sessions.
Attach the created profile to sessions to maintain authenticated state.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Display name for the profile')
    })
  )
  .output(
    z.object({
      profileId: z.string().describe('Created profile identifier'),
      name: z.string().optional().nullable().describe('Profile display name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HyperbrowserClient({ token: ctx.auth.token });

    let params: Record<string, unknown> = {};
    if (ctx.input.name) params.name = ctx.input.name;

    let result = await client.createProfile(params);

    return {
      output: {
        profileId: result.id as string,
        name: result.name as string | null | undefined
      },
      message: `Profile **${result.id}** created${result.name ? ` (${result.name})` : ''}.`
    };
  })
  .build();

export let listProfiles = SlateTool.create(spec, {
  name: 'List Profiles',
  key: 'list_profiles',
  description: `List browser profiles with optional filtering by name and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter profiles by name'),
      page: z.number().optional().describe('Page number for pagination'),
      limit: z.number().optional().describe('Number of profiles per page')
    })
  )
  .output(
    z.object({
      profiles: z.array(profileSchema).describe('List of profiles'),
      totalCount: z.number().optional().describe('Total number of profiles'),
      page: z.number().optional().describe('Current page number'),
      perPage: z.number().optional().describe('Profiles per page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HyperbrowserClient({ token: ctx.auth.token });
    let result = await client.listProfiles({
      name: ctx.input.name,
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let profiles = (result.profiles as Record<string, unknown>[]) ?? [];

    return {
      output: {
        profiles: profiles.map(p => ({
          profileId: p.id as string,
          name: p.name as string | null | undefined,
          teamId: p.teamId as string | undefined,
          createdAt: p.createdAt as string | undefined,
          updatedAt: p.updatedAt as string | undefined
        })),
        totalCount: result.totalCount as number | undefined,
        page: result.page as number | undefined,
        perPage: result.perPage as number | undefined
      },
      message: `Found **${result.totalCount ?? profiles.length}** profiles.`
    };
  })
  .build();

export let deleteProfile = SlateTool.create(spec, {
  name: 'Delete Profile',
  key: 'delete_profile',
  description: `Permanently delete a browser profile. This removes all stored cookies, login state, and browser data associated with the profile.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      profileId: z.string().describe('Profile ID to delete')
    })
  )
  .output(
    z.object({
      profileId: z.string().describe('Deleted profile ID'),
      deleted: z.boolean().describe('Whether the profile was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HyperbrowserClient({ token: ctx.auth.token });
    await client.deleteProfile(ctx.input.profileId);

    return {
      output: {
        profileId: ctx.input.profileId,
        deleted: true
      },
      message: `Profile **${ctx.input.profileId}** has been deleted.`
    };
  })
  .build();
