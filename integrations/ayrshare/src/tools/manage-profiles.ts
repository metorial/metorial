import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let platformEnum = z.enum([
  'bluesky',
  'facebook',
  'gmb',
  'instagram',
  'linkedin',
  'pinterest',
  'reddit',
  'snapchat',
  'telegram',
  'threads',
  'tiktok',
  'twitter',
  'youtube'
]);

export let createProfile = SlateTool.create(spec, {
  name: 'Create Profile',
  key: 'create_profile',
  description: `Create a new user profile for managing social media accounts on behalf of a client. Returns a profile key that must be stored securely — it cannot be retrieved again via API.
Requires Business plan.`,
  instructions: [
    'Store the returned profileKey securely — it cannot be retrieved again.',
    'The title must be unique across all profiles.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z
        .string()
        .describe('Unique title for the profile (displayed on social account linking page)'),
      disableSocial: z
        .array(platformEnum)
        .optional()
        .describe('Social networks to disable for this profile'),
      tags: z.array(z.string()).optional().describe('Tags for organizing profiles'),
      team: z.boolean().optional().describe('Create as a team member profile'),
      email: z
        .string()
        .optional()
        .describe('Email address (required if team is true, receives invite email)')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Creation status'),
      title: z.string().optional().describe('Profile title'),
      refId: z.string().optional().describe('Unique reference ID'),
      profileKey: z.string().optional().describe('Profile security key (store securely)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token
    });

    let result = await client.createProfile({
      title: ctx.input.title,
      disableSocial: ctx.input.disableSocial,
      tags: ctx.input.tags,
      team: ctx.input.team,
      email: ctx.input.email
    });

    return {
      output: {
        status: result.status || 'success',
        title: result.title,
        refId: result.refId,
        profileKey: result.profileKey
      },
      message: `Profile **${result.title}** created with ref ID **${result.refId}**. Profile key has been returned — store it securely.`
    };
  })
  .build();

export let getProfiles = SlateTool.create(spec, {
  name: 'Get Profiles',
  key: 'get_profiles',
  description: `List user profiles with optional filtering by title, reference ID, or active social accounts. Supports pagination for large profile lists. Requires Business plan.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(5000)
        .optional()
        .describe('Maximum profiles to return (default: 5000)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      title: z.string().optional().describe('Filter by profile title'),
      refId: z.string().optional().describe('Filter by reference ID'),
      hasActiveSocialAccounts: z
        .boolean()
        .optional()
        .describe('Filter for profiles with or without connected social accounts')
    })
  )
  .output(
    z.object({
      profiles: z
        .array(
          z.object({
            title: z.string().optional().describe('Profile name'),
            refId: z.string().optional().describe('Unique reference ID'),
            status: z.string().optional().describe('Profile status (active or suspended)'),
            created: z.string().optional().describe('Creation timestamp'),
            activeSocialAccounts: z
              .array(z.string())
              .optional()
              .describe('Connected social platforms')
          })
        )
        .describe('List of profiles'),
      count: z.number().optional().describe('Number of profiles returned'),
      hasMore: z.boolean().optional().describe('Whether more profiles are available'),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token
    });

    let result = await client.getProfiles({
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      title: ctx.input.title,
      refId: ctx.input.refId,
      hasActiveSocialAccounts: ctx.input.hasActiveSocialAccounts
    });

    let profiles = (result.profiles || []).map((p: any) => ({
      title: p.title || p.displayTitle,
      refId: p.refId,
      status: p.status,
      created: p.createdUTC || p.created,
      activeSocialAccounts: p.activeSocialAccounts
    }));

    return {
      output: {
        profiles,
        count: result.count || profiles.length,
        hasMore: result.pagination?.hasMore,
        nextCursor: result.pagination?.nextCursor
      },
      message: `Retrieved **${profiles.length}** profiles.${result.pagination?.hasMore ? ' More profiles available.' : ''}`
    };
  })
  .build();

export let deleteProfile = SlateTool.create(spec, {
  name: 'Delete Profile',
  key: 'delete_profile',
  description: `Permanently delete a user profile and all associated posts. This action is irreversible. Requires Business plan.`,
  constraints: [
    'This action is irreversible — all profile data and posts will be permanently deleted.',
    'Maximum 8 deletions per second.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      profileKey: z.string().describe('Profile Key of the profile to delete'),
      title: z
        .string()
        .optional()
        .describe('Profile title (alternative to Profile Key for identification)')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Deletion status'),
      refId: z.string().optional().describe('Reference ID of the deleted profile')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token
    });

    let result = await client.deleteProfile({
      profileKey: ctx.input.profileKey,
      title: ctx.input.title
    });

    return {
      output: {
        status: result.status || 'success',
        refId: result.refId
      },
      message: `Profile deleted. Ref ID: **${result.refId}**.`
    };
  })
  .build();
