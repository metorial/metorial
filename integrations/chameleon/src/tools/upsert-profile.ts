import { SlateTool } from 'slates';
import { z } from 'zod';
import { ChameleonClient } from '../lib/client';
import { spec } from '../spec';

export let upsertProfile = SlateTool.create(spec, {
  name: 'Create or Update User Profile',
  key: 'upsert_profile',
  description:
    'Create a Chameleon user profile by external UID, or update an existing profile by profile ID, UID, or email. Send custom user properties and associate the user with a company.',
  instructions: [
    'Provide uid when creating a new user. For an existing user, provide profileId, uid, or email. Use properties for custom fields such as name, role, plan, or disabled.'
  ]
})
  .input(
    z.object({
      profileId: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Existing Chameleon profile ID. Call get_profile or search_profiles to discover IDs.'
        ),
      uid: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Stable external user identifier from your backend. Required when creating a new profile.'
        ),
      email: z
        .string()
        .min(1)
        .optional()
        .describe(
          'User email. Can identify an existing profile if your installation sends email.'
        ),
      companyId: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Company ID to associate with this profile. Call list_companies to discover IDs.'
        ),
      companyUid: z
        .string()
        .min(1)
        .optional()
        .describe('External company identifier to associate with this profile'),
      properties: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Custom user properties sent as top-level fields; use dedicated inputs for identifiers'
        )
    })
  )
  .output(
    z.object({
      profileId: z.string().describe('Created or updated Chameleon profile ID'),
      profile: z
        .record(z.string(), z.unknown())
        .describe('Profile returned by Chameleon; may contain only its ID')
    })
  )
  .handleInvocation(async ctx => {
    let profile = await new ChameleonClient(ctx.auth.token).upsertProfile(ctx.input);
    return {
      output: { profileId: profile.id, profile },
      message: `Saved user profile **${profile.id}**. Call get_profile for the full profile.`
    };
  })
  .build();
