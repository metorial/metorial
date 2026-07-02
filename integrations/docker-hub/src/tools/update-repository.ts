import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { dockerHubServiceError } from '../lib/errors';
import { spec } from '../spec';

export let updateRepository = SlateTool.create(spec, {
  name: 'Update Repository',
  key: 'update_repository',
  description: `Update an existing Docker Hub repository's description, full description, or visibility. Only provided fields will be updated.`,
  tags: {
    destructive: false
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
      repositoryName: z.string().describe('Name of the repository to update.'),
      description: z
        .string()
        .optional()
        .describe('New short description (max 100 characters).'),
      fullDescription: z.string().optional().describe('New full markdown description.'),
      isPrivate: z
        .boolean()
        .optional()
        .describe('Set repository visibility. True for private, false for public.')
    })
  )
  .output(
    z.object({
      namespace: z.string().describe('Namespace of the updated repository.'),
      repositoryName: z.string().describe('Name of the updated repository.'),
      description: z.string().describe('Updated short description.'),
      isPrivate: z.boolean().describe('Updated visibility.')
    })
  )
  .handleInvocation(async ctx => {
    let ns = ctx.input.namespace || ctx.config.namespace || ctx.auth.username;

    let updateData: Record<string, unknown> = {};
    if (ctx.input.description !== undefined) updateData.description = ctx.input.description;
    if (ctx.input.fullDescription !== undefined)
      updateData.full_description = ctx.input.fullDescription;
    if (ctx.input.isPrivate !== undefined) updateData.is_private = ctx.input.isPrivate;

    if (Object.keys(updateData).length === 0) {
      throw dockerHubServiceError(
        'Provide description, fullDescription, or isPrivate to update the repository.'
      );
    }

    let client = new Client(ctx.auth);
    let repo = await client.updateRepository(ns, ctx.input.repositoryName, updateData);

    return {
      output: {
        namespace: repo.namespace,
        repositoryName: repo.name,
        description: repo.description || '',
        isPrivate: repo.is_private
      },
      message: `Updated repository **${ns}/${repo.name}**.`
    };
  })
  .build();
