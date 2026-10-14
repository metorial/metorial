import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listProfileRestrictions = SlateTool.create(spec, {
  name: 'List Profile Restrictions',
  key: 'list_profile_restrictions',
  description:
    'Discover currently available profile restrictions, such as Safe Search, with their identifiers and descriptions. Optionally list the restrictions enabled on a profile. Restrictions are separate from Profile Options.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      profileId: z
        .string()
        .optional()
        .describe(
          'Profile ID to also list enabled restrictions. Call list_profiles to discover profile IDs.'
        )
    })
  )
  .output(
    z.object({
      restrictions: z.array(
        z.object({
          restrictionId: z
            .string()
            .describe('Restriction identifier used to enable or disable it'),
          name: z.string().describe('Restriction display name'),
          description: z.string().nullable().describe('Restriction description, when provided')
        })
      ),
      enabledRestrictionIds: z
        .array(z.string())
        .optional()
        .describe(
          'Restrictions configured on the requested profile, including identifiers no longer in the available catalog'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let restrictions = await client.listProfileRestrictions();
    let enabledRestrictionIds = ctx.input.profileId
      ? await client.listEnabledProfileRestrictions(ctx.input.profileId)
      : undefined;

    return {
      output: {
        restrictions: restrictions.map(restriction => ({
          restrictionId: restriction.PK,
          name: restriction.name,
          description: restriction.description
        })),
        enabledRestrictionIds
      },
      message: `Found **${restrictions.length}** available profile restriction(s).`
    };
  })
  .build();
