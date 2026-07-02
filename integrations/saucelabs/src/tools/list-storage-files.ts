import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let storageFileSchema = z.object({
  fileId: z.string().describe('File identifier'),
  name: z.string().optional().describe('File name'),
  kind: z.string().optional().describe('File kind (android, ios)'),
  size: z.number().optional().describe('File size in bytes'),
  uploadTimestamp: z.number().optional().describe('Upload time (Unix timestamp)'),
  description: z.string().optional().describe('File description'),
  tags: z.array(z.string()).optional().describe('File tags'),
  groupId: z.number().optional().describe('App group ID'),
  sha256: z.string().optional().describe('SHA-256 hash'),
  appName: z.string().optional().describe('Application name from metadata'),
  appVersion: z.string().optional().describe('Application version from metadata'),
  appIdentifier: z.string().optional().describe('Package/bundle identifier from metadata')
});

export let listStorageFiles = SlateTool.create(spec, {
  name: 'List Storage Files',
  key: 'list_storage_files',
  description: `Browse uploaded app files in Sauce Labs storage. Filter by name, platform (Android/iOS), tags, or search text. Shows app metadata including version and bundle identifier.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query for file name or metadata'),
      name: z.string().optional().describe('Exact file name filter (case-insensitive)'),
      kind: z
        .array(z.enum(['android', 'ios']))
        .optional()
        .describe('Filter by platform'),
      tag: z.array(z.string()).optional().describe('Filter by tags'),
      page: z.number().optional().describe('Page number (default 1)'),
      perPage: z.number().optional().describe('Results per page (max 100)')
    })
  )
  .output(
    z.object({
      files: z.array(storageFileSchema).describe('Uploaded files'),
      totalCount: z.number().optional().describe('Total matching files'),
      page: z.number().optional().describe('Current page'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listStorageFiles({
      q: ctx.input.query,
      name: ctx.input.name,
      kind: ctx.input.kind,
      tag: ctx.input.tag,
      page: ctx.input.page,
      per_page: ctx.input.perPage
    });

    let items = result.items ?? [];
    let files = items.map((f: any) => ({
      fileId: f.id,
      name: f.name,
      kind: f.kind,
      size: f.size,
      uploadTimestamp: f.upload_timestamp,
      description: f.description,
      tags: f.tags,
      groupId: f.group_id,
      sha256: f.sha256,
      appName: f.metadata?.name,
      appVersion: f.metadata?.version,
      appIdentifier: f.metadata?.identifier
    }));

    return {
      output: {
        files,
        totalCount: result.total_items,
        page: result.page,
        perPage: result.per_page
      },
      message: `Found **${files.length}** file(s)${result.total_items != null ? ` (total: ${result.total_items})` : ''}.`
    };
  })
  .build();
