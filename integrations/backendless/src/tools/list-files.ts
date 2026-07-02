import { SlateTool } from 'slates';
import { z } from 'zod';
import { BackendlessClient } from '../lib/client';
import { spec } from '../spec';

export let listFiles = SlateTool.create(spec, {
  name: 'List Files',
  key: 'list_files',
  description: `Lists files and directories in Backendless file storage. Supports filtering by file name pattern, recursive listing, and pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      directoryPath: z
        .string()
        .describe('Directory path to list, e.g. "/" for root, "/images", "/web/assets"'),
      pattern: z
        .string()
        .optional()
        .describe('Wildcard pattern to filter files, e.g. "*.html", "report_*"'),
      recursive: z
        .boolean()
        .optional()
        .describe('If true, recursively lists files in subdirectories'),
      pageSize: z.number().optional().describe('Number of items per page'),
      offset: z.number().optional().describe('Starting index for pagination')
    })
  )
  .output(
    z.object({
      files: z
        .array(
          z.object({
            fileName: z.string().describe('File or directory name'),
            createdOn: z.number().describe('Creation timestamp in milliseconds'),
            publicUrl: z.string().describe('Public URL for downloading the file'),
            relativePath: z.string().describe('Relative path from storage root'),
            sizeInBytes: z.number().describe('File size in bytes')
          })
        )
        .describe('List of files and directories'),
      count: z.number().describe('Number of items returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BackendlessClient({
      applicationId: ctx.auth.applicationId,
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      region: ctx.config.region
    });

    let files = await client.listFiles(ctx.input.directoryPath, {
      pattern: ctx.input.pattern,
      recursive: ctx.input.recursive,
      pageSize: ctx.input.pageSize,
      offset: ctx.input.offset
    });

    let mappedFiles = files.map(f => ({
      fileName: f.name,
      createdOn: f.createdOn,
      publicUrl: f.publicUrl,
      relativePath: f.url,
      sizeInBytes: f.size
    }));

    return {
      output: {
        files: mappedFiles,
        count: mappedFiles.length
      },
      message: `Found **${mappedFiles.length}** items in **${ctx.input.directoryPath}**${ctx.input.pattern ? ` matching \`${ctx.input.pattern}\`` : ''}.`
    };
  })
  .build();
