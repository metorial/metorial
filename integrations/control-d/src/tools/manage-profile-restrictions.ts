import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageProfileRestrictions = SlateTool.create(spec, {
  name: 'Manage Profile Restrictions',
  key: 'manage_profile_restrictions',
  description:
    'Enable or disable one profile restriction and return the complete updated list of enabled restriction identifiers. Call list_profile_restrictions to discover available identifiers and list_profiles to discover profile IDs. Requires a write API token and an unlocked profile; organization members need Admin permissions or higher.',
  instructions: [
    'Enabling requires a currently available restriction identifier. Disabling can remove a restriction that is no longer available in the catalog.'
  ]
})
  .input(
    z.object({
      profileId: z
        .string()
        .describe('Profile ID. Call list_profiles to discover profile IDs.'),
      restrictionId: z
        .string()
        .describe(
          'Restriction identifier, not its display name. Call list_profile_restrictions to discover identifiers.'
        ),
      enabled: z.boolean().describe('True to enable the restriction; false to disable it')
    })
  )
  .output(
    z.object({
      profileId: z.string().describe('Profile ID that was updated'),
      enabledRestrictionIds: z
        .array(z.string())
        .describe('Complete updated list of restrictions configured on the profile')
    })
  )
  .handleInvocation(async ctx => {
    let { profileId, restrictionId, enabled } = ctx.input;
    let enabledRestrictionIds = await createClient(ctx).modifyProfileRestriction(
      profileId,
      restrictionId,
      enabled
    );

    return {
      output: { profileId, enabledRestrictionIds },
      message: `${enabled ? 'Enabled' : 'Disabled'} restriction **${restrictionId}** on profile ${profileId}.`
    };
  })
  .build();
