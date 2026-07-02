import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProfileTool = SlateTool.create(spec, {
  name: 'Get Profile',
  key: 'get_profile',
  description: `Retrieve the current user's profile information including name, email, language, and default team/project IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      profileId: z.string().describe('Unique ID of the user profile'),
      fullname: z.string().describe('Full name of the user'),
      email: z.string().describe('Email address of the user'),
      lang: z.string().optional().describe('Preferred language code'),
      theme: z.string().optional().describe('Preferred UI theme'),
      defaultTeamId: z.string().describe('ID of the default team'),
      defaultProjectId: z.string().describe('ID of the default project'),
      createdAt: z.string().describe('When the profile was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let profile = await client.getProfile();

    return {
      output: {
        profileId: profile.id,
        fullname: profile.fullname,
        email: profile.email,
        lang: profile.lang,
        theme: profile.theme,
        defaultTeamId: profile['default-team-id'] ?? profile.defaultTeamId,
        defaultProjectId: profile['default-project-id'] ?? profile.defaultProjectId,
        createdAt: profile['created-at'] ?? profile.createdAt
      },
      message: `Retrieved profile for **${profile.fullname}** (${profile.email}).`
    };
  })
  .build();
