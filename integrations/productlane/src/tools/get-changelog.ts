import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getChangelog = SlateTool.create(spec, {
  name: 'Get Changelog',
  key: 'get_changelog',
  description: `Retrieve a specific changelog entry by ID, including its full content/notes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      changelogId: z.string().describe('ID of the changelog to retrieve'),
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID (uses config workspace if not provided)')
    })
  )
  .output(
    z.object({
      changelogId: z.string().describe('Unique ID of the changelog'),
      title: z.string().describe('Changelog title'),
      notes: z.any().describe('Changelog content/notes'),
      published: z.boolean().describe('Whether the changelog is published'),
      archived: z.boolean().describe('Whether the changelog is archived'),
      date: z.string().nullable().describe('Changelog date'),
      imageUrl: z.string().nullable().describe('Cover image URL'),
      workspaceId: z.string().describe('Workspace ID'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last updated timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let workspaceId = ctx.input.workspaceId || ctx.config.workspaceId;
    if (!workspaceId) {
      throw new Error(
        'workspaceId is required. Provide it in the input or set it in the config.'
      );
    }

    let client = new Client({ token: ctx.auth.token });
    let c = await client.getChangelog(workspaceId, ctx.input.changelogId);

    return {
      output: {
        changelogId: c.id,
        title: c.title,
        notes: c.notes,
        published: c.published ?? false,
        archived: c.archived ?? false,
        date: c.date ?? null,
        imageUrl: c.imageUrl ?? null,
        workspaceId: c.workspaceId,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      },
      message: `Retrieved changelog **${c.title}** (${c.published ? 'published' : 'draft'}).`
    };
  })
  .build();
