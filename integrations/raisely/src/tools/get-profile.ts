import { SlateTool } from 'slates';
import { z } from 'zod';
import { RaiselyClient } from '../lib/client';
import { sanitizeRaiselyLookup } from '../lib/output';
import { spec } from '../spec';

export let getProfile = SlateTool.create(spec, {
  name: 'Get Profile',
  key: 'get_profile',
  description:
    'Retrieve one fundraising profile by UUID or path. Use list_profiles to discover profile UUIDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      profileUuid: z.string().describe('Profile UUID or path from list_profiles'),
      campaignUuid: z
        .string()
        .optional()
        .describe(
          'Campaign UUID or path from list_campaigns, useful when identifying a profile by path'
        ),
      includePrivateData: z
        .boolean()
        .optional()
        .describe('Include private/custom field data when permitted')
    })
  )
  .output(z.object({ profile: z.record(z.string(), z.any()) }))
  .handleInvocation(async ctx => {
    let client = new RaiselyClient({ token: ctx.auth.token });
    let result = await client.getProfile(ctx.input.profileUuid, {
      campaign: ctx.input.campaignUuid,
      private: ctx.input.includePrivateData
    });
    return {
      output: { profile: sanitizeRaiselyLookup(result.data, 'profile') },
      message: `Retrieved profile **${ctx.input.profileUuid}**.`
    };
  })
  .build();
