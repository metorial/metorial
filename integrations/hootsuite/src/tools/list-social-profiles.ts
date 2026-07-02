import { SlateTool } from 'slates';
import { z } from 'zod';
import { HootsuiteClient } from '../lib/client';
import { spec } from '../spec';

export let listSocialProfilesTool = SlateTool.create(spec, {
  name: 'List Social Profiles',
  key: 'list_social_profiles',
  description: `Retrieve social profiles accessible to the authenticated user, or fetch details for a specific social profile.
Social profiles represent connected social media accounts (Twitter, Facebook, Instagram, LinkedIn, Pinterest).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      socialProfileId: z.string().optional().describe('Fetch a specific social profile by ID')
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
          ownerId: z.string().optional().describe('Hootsuite member ID who owns this profile')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new HootsuiteClient(ctx.auth.token);

    if (ctx.input.socialProfileId) {
      let profile = await client.getSocialProfile(ctx.input.socialProfileId);
      let socialProfiles = [
        {
          socialProfileId: String(profile.id),
          type: profile.type,
          socialNetworkId: profile.socialNetworkId
            ? String(profile.socialNetworkId)
            : undefined,
          socialNetworkUsername: profile.socialNetworkUsername,
          avatarUrl: profile.avatarUrl,
          ownerId: profile.owner?.id ? String(profile.owner.id) : undefined
        }
      ];

      return {
        output: { socialProfiles },
        message: `Retrieved social profile **${profile.socialNetworkUsername || profile.id}** (${profile.type}).`
      };
    }

    let profiles = await client.getSocialProfiles();
    let socialProfiles = profiles.map((p: any) => ({
      socialProfileId: String(p.id),
      type: p.type,
      socialNetworkId: p.socialNetworkId ? String(p.socialNetworkId) : undefined,
      socialNetworkUsername: p.socialNetworkUsername,
      avatarUrl: p.avatarUrl,
      ownerId: p.owner?.id ? String(p.owner.id) : undefined
    }));

    return {
      output: { socialProfiles },
      message: `Found **${socialProfiles.length}** social profile(s).`
    };
  })
  .build();
