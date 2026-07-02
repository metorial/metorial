import { SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { spec } from '../spec';

export let githubProfile = SlateTool.create(spec, {
  name: 'GitHub Profile',
  key: 'github_profile',
  description: `Retrieve public information from a GitHub user profile including name, email, company, location, follower/following counts, public repos, and SSH keys. Supports lookup by username, URL, or email.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      usernameOrUrl: z.string().describe('GitHub username, profile URL, or email address')
    })
  )
  .output(
    z.object({
      githubId: z.number().optional(),
      login: z.string().optional(),
      name: z.string().optional(),
      email: z.string().nullable().optional(),
      company: z.string().nullable().optional(),
      location: z.string().nullable().optional(),
      avatarUrl: z.string().optional(),
      followers: z.number().optional(),
      following: z.number().optional(),
      publicRepos: z.number().optional(),
      publicGists: z.number().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      raw: z.any().describe('Full raw response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result = await client.getGithubUser({ query: ctx.input.usernameOrUrl });

    return {
      output: {
        githubId: result.id,
        login: result.login,
        name: result.name,
        email: result.email,
        company: result.company,
        location: result.location,
        avatarUrl: result.avatar_url,
        followers: result.followers,
        following: result.following,
        publicRepos: result.public_repos,
        publicGists: result.public_gists,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        raw: result
      },
      message: `Retrieved GitHub profile **${result.login ?? result.name ?? ctx.input.usernameOrUrl}**: **${result.public_repos ?? 0} repos**, **${result.followers ?? 0} followers**.`
    };
  })
  .build();
