import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let changelogSchema = z.object({
  changelogId: z.string().describe('Unique ID of the changelog entry'),
  title: z.string().describe('Changelog title'),
  published: z.boolean().describe('Whether the changelog is published'),
  archived: z.boolean().describe('Whether the changelog is archived'),
  date: z.string().nullable().describe('Changelog date'),
  imageUrl: z.string().nullable().describe('Cover image URL'),
  workspaceId: z.string().describe('Workspace ID'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last updated timestamp')
});

export let listChangelogs = SlateTool.create(spec, {
  name: 'List Changelogs',
  key: 'list_changelogs',
  description: `List changelog entries for a workspace. Published changelogs are publicly accessible. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID (uses config workspace if not provided)'),
      language: z.string().optional().describe('Language code for localized content'),
      skip: z.number().optional().describe('Number of records to skip'),
      take: z.number().optional().describe('Number of records to return (max 100)')
    })
  )
  .output(
    z.object({
      changelogs: z.array(changelogSchema).describe('List of changelog entries')
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
    let result = await client.listChangelogs(workspaceId, {
      language: ctx.input.language,
      skip: ctx.input.skip,
      take: ctx.input.take
    });

    let changelogs = (Array.isArray(result) ? result : result.changelogs || []).map(
      (c: any) => ({
        changelogId: c.id,
        title: c.title,
        published: c.published ?? false,
        archived: c.archived ?? false,
        date: c.date ?? null,
        imageUrl: c.imageUrl ?? null,
        workspaceId: c.workspaceId,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      })
    );

    return {
      output: { changelogs },
      message: `Found **${changelogs.length}** changelog entries.`
    };
  })
  .build();
