import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageProfile = SlateTool.create(spec, {
  name: 'Manage Browser Profile',
  key: 'manage_profile',
  description: `Create, retrieve, list, or delete browser profiles. Profiles persist cookies, local storage, and cache from a session for reuse across future sessions, maintaining authenticated states without re-logging in.`,
  instructions: [
    'To create a profile, provide a name and the sessionId of an active session.',
    'To list all profiles, set action to "list".',
    'To get a specific profile, provide the profile name and set action to "get".',
    'To delete a profile, provide the profile name and set action to "delete".'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'list', 'delete']).describe('Operation to perform'),
      profileName: z
        .string()
        .optional()
        .describe('Name of the profile (required for create, get, delete)'),
      sessionId: z
        .string()
        .optional()
        .describe('Session ID to create profile from (required for create)'),
      description: z.string().optional().describe('Profile description (for create)'),
      dedicatedStickyIp: z
        .boolean()
        .optional()
        .describe('Assign a dedicated sticky IP to this profile (for create)')
    })
  )
  .output(
    z.object({
      profiles: z
        .array(
          z.object({
            profileName: z.string(),
            description: z.string().optional(),
            source: z.string().optional(),
            sessionId: z.string().optional(),
            status: z.string().optional(),
            createdAt: z.string().optional()
          })
        )
        .optional(),
      profile: z
        .object({
          profileName: z.string(),
          description: z.string().optional(),
          source: z.string().optional(),
          sessionId: z.string().optional(),
          status: z.string().optional(),
          createdAt: z.string().optional()
        })
        .optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    if (input.action === 'list') {
      let result = await client.listProfiles();
      let items = result.items ?? [];
      return {
        output: {
          profiles: items.map(p => ({
            profileName: p.name,
            description: p.description,
            source: p.source,
            sessionId: p.session_id,
            status: p.status,
            createdAt: p.created_at
          }))
        },
        message: `Found **${result.count ?? items.length}** profiles.`
      };
    }

    if (input.action === 'get') {
      if (!input.profileName) throw new Error('profileName is required for get.');
      let p = await client.getProfile(input.profileName);
      return {
        output: {
          profile: {
            profileName: p.name ?? input.profileName,
            description: p.description,
            source: p.source,
            sessionId: p.session_id,
            status: p.status,
            createdAt: p.created_at
          }
        },
        message: `Profile **${input.profileName}** retrieved (status: ${p.status}).`
      };
    }

    if (input.action === 'create') {
      if (!input.profileName) throw new Error('profileName is required for create.');
      let result = await client.createProfile({
        name: input.profileName,
        description: input.description,
        source: 'session',
        session_id: input.sessionId,
        dedicated_sticky_ip: input.dedicatedStickyIp
      });
      return {
        output: {
          profile: {
            profileName: result.name,
            description: result.description,
            source: result.source,
            sessionId: result.session_id,
            status: result.status,
            createdAt: result.created_at
          }
        },
        message: `Profile **${result.name}** created from session **${result.session_id}**.`
      };
    }

    if (input.action === 'delete') {
      if (!input.profileName) throw new Error('profileName is required for delete.');
      await client.deleteProfile(input.profileName);
      return {
        output: { deleted: true },
        message: `Profile **${input.profileName}** has been deleted.`
      };
    }

    throw new Error(`Unknown action: ${input.action}`);
  })
  .build();
