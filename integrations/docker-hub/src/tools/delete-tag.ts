import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTag = SlateTool.create(spec, {
  name: 'Delete Image Tag',
  key: 'delete_tag',
  description: `Delete a specific tag from a Docker Hub repository. This removes the tag reference but does not delete the underlying image layers if other tags reference them.`,
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
      repositoryName: z.string().describe('Name of the repository.'),
      tagName: z.string().describe('Name of the tag to delete.')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the tag was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let ns = ctx.input.namespace || ctx.config.namespace || ctx.auth.username;

    let client = new Client({ token: ctx.auth.token });
    await client.deleteTag(ns, ctx.input.repositoryName, ctx.input.tagName);

    return {
      output: { deleted: true },
      message: `Deleted tag **${ctx.input.tagName}** from **${ns}/${ctx.input.repositoryName}**.`
    };
  })
  .build();
