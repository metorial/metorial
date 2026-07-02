import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageProfile = SlateTool.create(spec, {
  name: 'Manage Organization Profile',
  key: 'manage_profile',
  description: `Create or update an organization profile associated with a DID. Profiles include branding and display information shown when issuing and verifying credentials. To create a new profile, provide the DID and name. To update, provide the DID and the fields to change.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      did: z.string().describe('DID to associate the profile with'),
      profileName: z.string().optional().describe('Organization display name'),
      profileDescription: z.string().optional().describe('Organization description'),
      logo: z.string().optional().describe('URL to the organization logo image'),
      action: z
        .enum(['create', 'update'])
        .default('create')
        .describe('Whether to create a new profile or update an existing one')
    })
  )
  .output(
    z.object({
      did: z.string().describe('The DID associated with the profile'),
      profile: z.any().describe('The profile details')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result: any;

    if (ctx.input.action === 'create') {
      result = await client.createProfile({
        did: ctx.input.did,
        name: ctx.input.profileName || '',
        logo: ctx.input.logo,
        description: ctx.input.profileDescription
      });
    } else {
      result = await client.updateProfile(ctx.input.did, {
        name: ctx.input.profileName,
        logo: ctx.input.logo,
        description: ctx.input.profileDescription
      });
    }

    return {
      output: {
        did: ctx.input.did,
        profile: result
      },
      message: `${ctx.input.action === 'create' ? 'Created' : 'Updated'} profile for DID **${ctx.input.did}**.`
    };
  })
  .build();
