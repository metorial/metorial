import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let versionSchema = z.object({
  versionId: z.string().describe('Version identifier'),
  name: z.string().nullable().describe('Name at this version'),
  importName: z.string().nullable().describe('Import name at this version'),
  description: z.string().nullable().describe('Description at this version'),
  code: z.string().describe('Code at this version'),
  language: z.string().describe('Programming language'),
  createdAt: z.string().describe('When this version was created'),
  updatedAt: z.string().describe('When this version was last updated')
});

export let listLibraryVersions = SlateTool.create(spec, {
  name: 'List Library Versions',
  key: 'list_library_versions',
  description: `List all version revisions of a specific library. Each update to a library creates a new revision. Use this to view version history and find a specific version ID for rollback via the **Publish** tool.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      libraryId: z.string().describe('ID of the library'),
      count: z.number().optional().describe('Number of versions to return (default: 5)'),
      orderBy: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Sort order by creation date (default: asc)')
    })
  )
  .output(
    z.object({
      versions: z.array(versionSchema).describe('List of library version revisions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.listLibraryVersions(ctx.input.libraryId, {
      count: ctx.input.count,
      orderBy: ctx.input.orderBy
    });

    let versions = result.versions ?? result ?? [];
    let items = (Array.isArray(versions) ? versions : []).map((v: any) => ({
      versionId: v.versionId ?? v.id,
      name: v.name ?? null,
      importName: v.importName ?? null,
      description: v.description ?? null,
      code: v.code,
      language: v.language,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt
    }));

    return {
      output: { versions: items },
      message: `Found **${items.length}** version(s) for library \`${ctx.input.libraryId}\`.`
    };
  })
  .build();
