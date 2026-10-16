import { SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { normalizeOutput } from '../lib/response';
import { spec } from '../spec';

let githubProfileOutputSchema = z.object({
  githubId: z.number().optional(),
  login: z.string().optional(),
  emails: z.array(z.string()).optional(),
  publicGistsText: z.string().optional(),
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
});

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
  .output(githubProfileOutputSchema)
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result = await client.getGithubUser({ query: ctx.input.usernameOrUrl });

    return {
      output: normalizeOutput(githubProfileOutputSchema, {
        githubId: result.id,
        login: result.login,
        name: result.name,
        email: result.email,
        emails: Array.isArray(result.email) ? result.email : undefined,
        publicGistsText:
          typeof result.public_gists === 'string' ? result.public_gists : undefined,
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
      }),
      message:
        'Retrieved public GitHub profile data. The provider currently documents degraded availability for this endpoint.'
    };
  })
  .build();
