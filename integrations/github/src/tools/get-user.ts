import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve a GitHub user's profile. Provide a username to look up any user, or omit it to get the authenticated user's profile.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      username: z
        .string()
        .optional()
        .describe('GitHub username to look up. Omit to get the authenticated user.')
    })
  )
  .output(
    z.object({
      userId: z.number().describe('User ID'),
      login: z.string().describe('Username'),
      name: z.string().nullable().describe('Display name'),
      email: z.string().nullable().describe('Public email'),
      bio: z.string().nullable().describe('User bio'),
      company: z.string().nullable().describe('Company'),
      location: z.string().nullable().describe('Location'),
      htmlUrl: z.string().describe('Profile URL'),
      avatarUrl: z.string().describe('Avatar URL'),
      publicRepos: z.number().describe('Number of public repositories'),
      followers: z.number().describe('Number of followers'),
      following: z.number().describe('Number of users following'),
      createdAt: z.string().describe('Account creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });
    let user = ctx.input.username
      ? await client.getUser(ctx.input.username)
      : await client.getAuthenticatedUser();

    return {
      output: {
        userId: user.id,
        login: user.login,
        name: user.name,
        email: user.email,
        bio: user.bio,
        company: user.company,
        location: user.location,
        htmlUrl: user.html_url,
        avatarUrl: user.avatar_url,
        publicRepos: user.public_repos,
        followers: user.followers,
        following: user.following,
        createdAt: user.created_at
      },
      message: `User **${user.login}**${user.name ? ` (${user.name})` : ''} — ${user.public_repos} public repos, ${user.followers} followers.`
    };
  })
  .build();
