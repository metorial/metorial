import { SlateTool } from 'slates';
import { z } from 'zod';
import { DockClient } from '../lib/client';
import { spec } from '../spec';

export let manageProfile = SlateTool.create(spec, {
  name: 'Manage Profile',
  key: 'manage_profile',
  description: `Create, retrieve, update, list, or delete organization profiles. Profiles provide context for an issuer DID, including name, description, and logo that appear on issued credentials.`,
  instructions: [
    'To create a profile, set action to "create" and provide a name and the associated DID.',
    'To update a profile, set action to "update" and provide the profileId with the fields to change.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'list', 'update', 'delete'])
        .describe('Operation to perform'),
      profileId: z
        .string()
        .optional()
        .describe('Profile ID (required for get, update, delete)'),
      name: z.string().optional().describe('Organization name (required for create)'),
      did: z.string().optional().describe('Associated DID (required for create)'),
      description: z.string().optional().describe('Organization description'),
      logo: z.string().optional().describe('URL of the organization logo'),
      offset: z.number().optional().describe('Pagination offset for list'),
      limit: z.number().optional().describe('Maximum number of results for list')
    })
  )
  .output(
    z.object({
      profile: z.record(z.string(), z.unknown()).optional().describe('The profile document'),
      profiles: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of profiles'),
      deleted: z.boolean().optional().describe('Whether the profile was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DockClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.name) throw new Error('name is required for create action');
        if (!ctx.input.did) throw new Error('did is required for create action');
        let result = await client.createProfile({
          name: ctx.input.name,
          did: ctx.input.did,
          description: ctx.input.description,
          logo: ctx.input.logo
        });
        return {
          output: { profile: result },
          message: `Created profile **${ctx.input.name}** for DID **${ctx.input.did}**`
        };
      }
      case 'get': {
        if (!ctx.input.profileId) throw new Error('profileId is required for get action');
        let result = await client.getProfile(ctx.input.profileId);
        return {
          output: { profile: result },
          message: `Retrieved profile **${ctx.input.profileId}**`
        };
      }
      case 'list': {
        let results = await client.listProfiles({
          offset: ctx.input.offset,
          limit: ctx.input.limit
        });
        return {
          output: { profiles: results },
          message: `Found **${results.length}** profile(s)`
        };
      }
      case 'update': {
        if (!ctx.input.profileId) throw new Error('profileId is required for update action');
        let result = await client.updateProfile(ctx.input.profileId, {
          name: ctx.input.name,
          description: ctx.input.description,
          logo: ctx.input.logo
        });
        return {
          output: { profile: result },
          message: `Updated profile **${ctx.input.profileId}**`
        };
      }
      case 'delete': {
        if (!ctx.input.profileId) throw new Error('profileId is required for delete action');
        await client.deleteProfile(ctx.input.profileId);
        return {
          output: { deleted: true },
          message: `Deleted profile **${ctx.input.profileId}**`
        };
      }
    }
  })
  .build();
