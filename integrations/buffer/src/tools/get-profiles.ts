import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let profileSchema = z.object({
  profileId: z.string().describe('Unique identifier for the profile'),
  service: z
    .string()
    .describe('Social network service name (e.g. twitter, facebook, linkedin)'),
  serviceUsername: z.string().describe('Username on the social network'),
  formattedService: z.string().describe('Human-readable service name'),
  formattedUsername: z.string().describe('Human-readable username'),
  avatar: z.string().describe('URL of the profile avatar'),
  isDefault: z.boolean().describe('Whether this is the default profile'),
  sentCount: z.number().describe('Number of sent updates'),
  pendingCount: z.number().describe('Number of pending updates'),
  draftsCount: z.number().describe('Number of draft updates')
});

export let getProfilesTool = SlateTool.create(spec, {
  name: 'Get Profiles',
  key: 'get_profiles',
  description: `Retrieve connected social media profiles. Returns all profiles linked to the account, or a single profile by ID. Includes service type, username, avatar, and post counts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      profileId: z
        .string()
        .optional()
        .describe(
          'Optional profile ID to retrieve a specific profile. If omitted, returns all profiles.'
        )
    })
  )
  .output(
    z.object({
      profiles: z.array(profileSchema).describe('List of social media profiles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let profiles: any;
    if (ctx.input.profileId) {
      let profile = await client.getProfile(ctx.input.profileId);
      profiles = [profile];
    } else {
      profiles = await client.getProfiles();
    }

    let mapped = profiles.map((p: any) => ({
      profileId: p.id,
      service: p.service,
      serviceUsername: p.serviceUsername,
      formattedService: p.formattedService,
      formattedUsername: p.formattedUsername,
      avatar: p.avatarHttps || p.avatar,
      isDefault: p.default,
      sentCount: p.counts?.sent ?? 0,
      pendingCount: p.counts?.pending ?? 0,
      draftsCount: p.counts?.drafts ?? 0
    }));

    return {
      output: { profiles: mapped },
      message: `Retrieved **${mapped.length}** profile(s): ${mapped.map((p: any) => `${p.formattedService} (@${p.serviceUsername})`).join(', ')}.`
    };
  })
  .build();
