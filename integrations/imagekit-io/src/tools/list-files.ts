import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let fileSchema = z.object({
  fileId: z.string().describe('Unique identifier for the file'),
  name: z.string().describe('File name'),
  filePath: z.string().describe('Full path of the file in the Media Library'),
  url: z.string().describe('CDN URL of the file'),
  thumbnailUrl: z.string().optional().nullable().describe('Thumbnail URL'),
  fileType: z.string().describe('Type: "image", "non-image", or "video"'),
  mime: z.string().optional().describe('MIME type'),
  size: z.number().describe('File size in bytes'),
  height: z.number().optional().nullable().describe('Height in pixels'),
  width: z.number().optional().nullable().describe('Width in pixels'),
  tags: z.array(z.string()).optional().nullable().describe('Tags'),
  aiTags: z.array(z.any()).optional().nullable().describe('AI-generated tags'),
  isPrivateFile: z.boolean().optional().describe('Whether the file is private'),
  customMetadata: z
    .record(z.string(), z.any())
    .optional()
    .nullable()
    .describe('Custom metadata'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listFiles = SlateTool.create(spec, {
  name: 'List Files',
  key: 'list_files',
  description: `Search and list files in the ImageKit Media Library. Supports powerful search queries using a Lucene-like syntax to filter by name, tags, file type, size, dimensions, creation date, custom metadata, and more.`,
  instructions: [
    'Use searchQuery for advanced filtering, e.g. \'name : "product"\', \'createdAt > "7d"\', \'(size < "1mb" AND width > 500)\'',
    'Supported search operators: =, :, IN, NOT =, NOT IN, <, <=, >, >=, HAS, EXISTS, NOT EXISTS'
  ],
  constraints: ['Maximum 1000 files per request'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      searchQuery: z
        .string()
        .optional()
        .describe(
          'Advanced search query using Lucene-like syntax, e.g. \'name : "product"\' or \'createdAt > "7d"\''
        ),
      path: z.string().optional().describe('Folder path to list files from, e.g. "/images/"'),
      fileType: z.enum(['image', 'non-image']).optional().describe('Filter by file type'),
      tags: z.array(z.string()).optional().describe('Filter by tags'),
      sort: z
        .string()
        .optional()
        .describe('Sort field and direction, e.g. "ASC_CREATED" or "DESC_SIZE"'),
      skip: z.number().optional().describe('Number of files to skip for pagination'),
      limit: z.number().optional().describe('Maximum number of files to return (default 1000)')
    })
  )
  .output(
    z.object({
      files: z.array(fileSchema).describe('List of matching files'),
      count: z.number().describe('Number of files returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let files = await client.listFiles({
      searchQuery: ctx.input.searchQuery,
      path: ctx.input.path,
      fileType: ctx.input.fileType,
      tags: ctx.input.tags,
      sort: ctx.input.sort,
      skip: ctx.input.skip,
      limit: ctx.input.limit
    });

    let mappedFiles = (files as any[]).map((f: any) => ({
      fileId: f.fileId,
      name: f.name,
      filePath: f.filePath,
      url: f.url,
      thumbnailUrl: f.thumbnailUrl,
      fileType: f.fileType,
      mime: f.mime,
      size: f.size,
      height: f.height,
      width: f.width,
      tags: f.tags,
      aiTags: f.AITags,
      isPrivateFile: f.isPrivateFile,
      customMetadata: f.customMetadata,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt
    }));

    return {
      output: {
        files: mappedFiles,
        count: mappedFiles.length
      },
      message: `Found **${mappedFiles.length}** file(s)${ctx.input.searchQuery ? ` matching query \`${ctx.input.searchQuery}\`` : ''}${ctx.input.path ? ` in \`${ctx.input.path}\`` : ''}.`
    };
  })
  .build();
