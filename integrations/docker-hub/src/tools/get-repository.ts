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
      dateRegistered: z.string().describe('ISO timestamp when the repository was created.'),
      statusDescription: z.string().optional().describe('Repository status label.'),
      contentTypes: z.array(z.string()).describe('Repository content types.'),
      mediaTypes: z.array(z.string()).describe('Repository media types.'),
      storageSize: z
        .number()
        .nullable()
        .optional()
        .describe('Repository storage size in bytes when returned by Docker Hub.'),
      categories: z
        .array(
          z.object({
            name: z.string().describe('Category display name.'),
            slug: z.string().describe('Category slug.')
          })
        )
        .describe('Docker Hub repository categories.'),
      permissions: z
        .object({
          read: z.boolean().describe('Whether the caller can read the repository.'),
          write: z.boolean().describe('Whether the caller can write to the repository.'),
          admin: z.boolean().describe('Whether the caller can administer the repository.')
        })
        .optional()
        .describe('Caller permissions when returned by Docker Hub.'),
      immutableTags: z
        .object({
          enabled: z.boolean().describe('Whether immutable tags are enabled.'),
          rules: z.array(z.string()).describe('Immutable tag regex rules.')
        })
        .optional()
        .describe('Immutable tag settings for the repository.')
    })
  )
  .handleInvocation(async ctx => {
    let ns = ctx.input.namespace || ctx.config.namespace || ctx.auth.username;

    let client = new Client(ctx.auth);
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
        dateRegistered: repo.date_registered,
        statusDescription: repo.status_description,
        contentTypes: repo.content_types || [],
        mediaTypes: repo.media_types || [],
        storageSize: repo.storage_size,
        categories: repo.categories || [],
        permissions: repo.permissions,
        immutableTags: repo.immutable_tags_settings
      },
      message: `Retrieved details for repository **${ns}/${ctx.input.repositoryName}** (${repo.is_private ? 'private' : 'public'}, ${repo.star_count} stars, ${repo.pull_count} pulls).`
    };
  })
  .build();
