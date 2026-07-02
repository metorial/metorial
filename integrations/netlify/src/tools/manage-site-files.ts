import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { netlifyServiceError } from '../lib/errors';
import { spec } from '../spec';

let fileOutputSchema = z.object({
  fileId: z.string().optional().describe('File identifier'),
  path: z.string().describe('Path of the deployed file'),
  sha: z.string().optional().describe('Content hash'),
  mimeType: z.string().optional().describe('MIME type'),
  size: z.number().optional().describe('File size in bytes')
});

let mapFile = (file: any) => ({
  fileId: file.id,
  path: file.path || '',
  sha: file.sha,
  mimeType: file.mime_type,
  size: file.size
});

export let manageSiteFiles = SlateTool.create(spec, {
  name: 'Manage Site Files',
  key: 'manage_site_files',
  description: `List deployed files for a Netlify site or get metadata for a specific deployed file path.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get']).describe('Action to perform'),
      siteId: z.string().describe('The site ID'),
      filePath: z
        .string()
        .optional()
        .describe('File path to retrieve for get action, for example /index.html')
    })
  )
  .output(
    z.object({
      files: z.array(fileOutputSchema).optional().describe('Files returned for list action'),
      file: fileOutputSchema.optional().describe('File returned for get action')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'get') {
      if (!ctx.input.filePath) {
        throw netlifyServiceError('filePath is required for get action');
      }

      let file = await client.getSiteFile(ctx.input.siteId, ctx.input.filePath);

      return {
        output: { file: mapFile(file) },
        message: `Retrieved file **${ctx.input.filePath}** from site **${ctx.input.siteId}**.`
      };
    }

    let files = await client.listSiteFiles(ctx.input.siteId);
    let mapped = files.map(mapFile);

    return {
      output: { files: mapped },
      message: `Found **${mapped.length}** file(s) for site **${ctx.input.siteId}**.`
    };
  })
  .build();
