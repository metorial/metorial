import { SlateTool } from 'slates';
import { z } from 'zod';
import { WakaTimeClient } from '../lib/client';
import { spec } from '../spec';

export let getUserProfile = SlateTool.create(spec, {
  name: 'Get User Profile',
  key: 'get_user_profile',
  description: `Retrieve the current user's profile information including display name, email, timezone, last active plugin, social profiles, plan details, and machines.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z
      .object({
        userId: z.string().describe('Unique user ID'),
        username: z.string().optional().describe('Username'),
        displayName: z.string().optional().describe('Display name'),
        email: z.string().optional().describe('Email address'),
        photoUrl: z.string().optional().describe('Profile photo URL'),
        timezone: z.string().optional().describe('User timezone'),
        lastProject: z.string().optional().describe('Last active project'),
        lastPlugin: z.string().optional().describe('Last active plugin/editor'),
        lastPluginName: z.string().optional().describe('Name of the last active plugin'),
        plan: z.string().optional().describe('Current plan (free, premium, etc.)'),
        createdAt: z.string().optional().describe('Account creation date'),
        lastHeartbeatAt: z.string().optional().describe('Timestamp of last heartbeat'),
        website: z.string().optional().describe('User website URL'),
        humanReadableWebsite: z.string().optional().describe('User website display text'),
        city: z.string().optional().describe('City'),
        isHireable: z.boolean().optional().describe('Whether user is hireable'),
        bio: z.string().optional().describe('User bio'),
        publicEmail: z.string().optional().describe('Public email'),
        githubUsername: z.string().optional().describe('GitHub username'),
        twitterUsername: z.string().optional().describe('Twitter/X username'),
        linkedInUsername: z.string().optional().describe('LinkedIn username')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new WakaTimeClient({ token: ctx.auth.token });

    let user = await client.getCurrentUser();

    return {
      output: {
        userId: user.id ?? '',
        username: user.username,
        displayName: user.display_name,
        email: user.email,
        photoUrl: user.photo,
        timezone: user.timezone,
        lastProject: user.last_project,
        lastPlugin: user.last_plugin,
        lastPluginName: user.last_plugin_name,
        plan: user.plan,
        createdAt: user.created_at,
        lastHeartbeatAt: user.last_heartbeat_at,
        website: user.website,
        humanReadableWebsite: user.human_readable_website,
        city: user.city,
        isHireable: user.is_hireable,
        bio: user.bio,
        publicEmail: user.public_email,
        githubUsername: user.github_username,
        twitterUsername: user.twitter_username,
        linkedInUsername: user.linkedin_username
      },
      message: `Profile for **${user.display_name || user.username}** (${user.email || 'no email'}). Plan: **${user.plan || 'unknown'}**. Timezone: **${user.timezone || 'unknown'}**.`
    };
  })
  .build();
