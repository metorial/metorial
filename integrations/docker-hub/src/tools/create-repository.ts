import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createRepository = SlateTool.create(spec, {
  name: 'Create Repository',
  key: 'create_repository',
  description: `Create a new Docker Hub repository under a namespace. Repositories can be public or private and are used to store and distribute Docker container images.`,
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
      repositoryName: z
        .string()
        .describe(
          'Name for the new repository. Must be lowercase and may contain letters, digits, and separators (-, _, .).'
        ),
      description: z
        .string()
        .optional()
        .describe('Short description of the repository (max 100 characters).'),
      fullDescription: z
        .string()
        .optional()
        .describe('Full markdown description for the repository overview.'),
      isPrivate: z
        .boolean()
        .optional()
        .describe('Whether the repository should be private. Defaults to false (public).')
    })
  )
  .output(
    z.object({
      namespace: z.string().describe('Namespace the repository was created under.'),
      repositoryName: z.string().describe('Name of the created repository.'),
      isPrivate: z.boolean().describe('Whether the repository is private.')
    })
  )
  .handleInvocation(async ctx => {
    let ns = ctx.input.namespace || ctx.config.namespace || ctx.auth.username;

    let client = new Client({ token: ctx.auth.token });
    let repo = await client.createRepository(ns, {
      name: ctx.input.repositoryName,
      description: ctx.input.description,
      full_description: ctx.input.fullDescription,
      is_private: ctx.input.isPrivate
    });

    return {
      output: {
        namespace: repo.namespace,
        repositoryName: repo.name,
        isPrivate: repo.is_private
      },
      message: `Created ${repo.is_private ? 'private' : 'public'} repository **${ns}/${repo.name}**.`
    };
  })
  .build();
