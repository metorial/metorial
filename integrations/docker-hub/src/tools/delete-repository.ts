import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteRepository = SlateTool.create(spec, {
  name: 'Delete Repository',
  key: 'delete_repository',
  description: `Permanently delete a Docker Hub repository and all of its tags and images. This action cannot be undone.`,
  constraints: [
    'This is a destructive action and cannot be undone. All images and tags in the repository will be permanently deleted.'
  ],
  tags: {
    destructive: true
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
      repositoryName: z.string().describe('Name of the repository to delete.')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the repository was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let ns = ctx.input.namespace || ctx.config.namespace || ctx.auth.username;

    let client = new Client({ token: ctx.auth.token });
    await client.deleteRepository(ns, ctx.input.repositoryName);

    return {
      output: { deleted: true },
      message: `Deleted repository **${ns}/${ctx.input.repositoryName}**.`
    };
  })
  .build();
