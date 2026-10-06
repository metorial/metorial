import { SlateTool } from 'slates';
import { z } from 'zod';
import { HootsuiteClient } from '../lib/client';
import type { SocialProfile } from '../lib/schemas';
import { spec } from '../spec';

export let listSocialProfilesTool = SlateTool.create(spec, {
  name: 'List Social Profiles',
  key: 'list_social_profiles',
  description: `Retrieve social profiles accessible to the authenticated user, or fetch details for a specific social profile.
Social profiles represent connected social accounts. Use the returned cursor to retrieve another page.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      socialProfileId: z.string().optional().describe('Fetch a specific social profile by ID'),
      cursor: z.string().optional().describe('Next-page cursor from a previous list response')
    })
  )
  .output(
    z.object({
      socialProfiles: z.array(
        z.object({
          socialProfileId: z.string().describe('Social profile ID'),
          type: z
            .string()
            .optional()
            .describe('Social network type (e.g. TWITTER, FACEBOOK, INSTAGRAM)'),
          socialNetworkId: z.string().optional().describe('ID on the social network'),
          socialNetworkUsername: z
            .string()
            .optional()
            .describe('Username on the social network'),
          avatarUrl: z.string().optional().describe('Profile avatar URL'),
          ownerId: z
            .string()
            .optional()
            .describe('Hootsuite member or organization ID that owns this profile'),
          ownerType: z.string().optional().describe('Owner type reported by Hootsuite'),
          requiresReauthentication: z
            .boolean()
            .optional()
            .describe('Whether Hootsuite reports that the connection needs reauthentication')
        })
      ),
      cursor: z.string().optional().describe('Cursor for the next page, absent at the end')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HootsuiteClient(ctx.auth.token);

    if (ctx.input.socialProfileId) {
      let profile = await client.getSocialProfile(ctx.input.socialProfileId);
      let socialProfiles = [mapProfile(profile)];

      return {
        output: { socialProfiles },
        message: `Retrieved social profile **${profile.socialNetworkUsername || profile.id}**.`
      };
    }

    let result = await client.getSocialProfiles(ctx.input.cursor);
    let socialProfiles = result.profiles.map(mapProfile);

    return {
      output: { socialProfiles, cursor: result.cursor },
      message: `Found **${socialProfiles.length}** social profile(s).`
    };
  })
  .build();

let mapProfile = (profile: SocialProfile) => ({
  socialProfileId: profile.id,
  type: profile.type,
  socialNetworkId: profile.socialNetworkId,
  socialNetworkUsername: profile.socialNetworkUsername,
  avatarUrl: profile.avatarUrl,
  ownerId:
    profile.ownerId ??
    (typeof profile.owner === 'object' && profile.owner ? profile.owner.id : undefined),
  ownerType: typeof profile.owner === 'string' ? profile.owner : undefined,
  requiresReauthentication:
    profile.isReauthRequired === undefined || profile.isReauthRequired === null
      ? undefined
      : Boolean(profile.isReauthRequired)
});
