import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRepository = SlateTool.create(spec, {
  name: 'Get Repository',
  key: 'get_repository',
  description: `Get detailed information about a specific Docker Hub repository, including its description, visibility, star/pull counts, and content types.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      namespace: z
        .string()
        .optional()
        .describe(
          'Docker Hub namespace (username or organization). Falls back to configured default namespace.'
        ),
      repositoryName: z.string().describe('Name of the repository.')
    })
  )
  .output(
    z.object({
      namespace: z.string().describe('Namespace the repository belongs to.'),
      repositoryName: z.string().describe('Name of the repository.'),
      description: z.string().describe('Short description of the repository.'),
      fullDescription: z.string().describe('Full markdown description of the repository.'),
      isPrivate: z.boolean().describe('Whether the repository is private.'),
      starCount: z.number().describe('Number of stars.'),
      pullCount: z.number().describe('Number of pulls.'),
      lastUpdated: z.string().describe('ISO timestamp of the last update.'),
      dateRegistered: z.string().describe('ISO timestamp when the repository was created.')
    })
  )
  .handleInvocation(async ctx => {
    let ns = ctx.input.namespace || ctx.config.namespace || ctx.auth.username;

    let client = new Client({ token: ctx.auth.token });
    let repo = await client.getRepository(ns, ctx.input.repositoryName);

    return {
      output: {
        namespace: repo.namespace,
        repositoryName: repo.name,
        description: repo.description || '',
        fullDescription: repo.full_description || '',
        isPrivate: repo.is_private,
        starCount: repo.star_count,
        pullCount: repo.pull_count,
        lastUpdated: repo.last_updated,
        dateRegistered: repo.date_registered
      },
      message: `Retrieved details for repository **${ns}/${ctx.input.repositoryName}** (${repo.is_private ? 'private' : 'public'}, ${repo.star_count} stars, ${repo.pull_count} pulls).`
    };
  })
  .build();
