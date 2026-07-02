import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFiles = SlateTool.create(spec, {
  name: 'List Files',
  key: 'list_files',
  description: `List files uploaded to your Vapi account. Files can be used as knowledge sources for assistants' retrieval-augmented generation.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      files: z
        .array(
          z.object({
            fileId: z.string().describe('ID of the file'),
            name: z.string().optional().describe('User-defined file name'),
            originalName: z.string().optional().describe('Original filename'),
            status: z
              .string()
              .optional()
              .describe('Processing status (processing, done, failed)'),
            bytes: z.number().optional().describe('File size in bytes'),
            purpose: z.string().optional().describe('Intended use of the file'),
            mimetype: z.string().optional().describe('File content type'),
            url: z.string().optional().describe('File access URL'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('List of files'),
      count: z.number().describe('Number of files returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let files = await client.listFiles();

    return {
      output: {
        files: files.map((f: any) => ({
          fileId: f.id,
          name: f.name,
          originalName: f.originalName,
          status: f.status,
          bytes: f.bytes,
          purpose: f.purpose,
          mimetype: f.mimetype,
          url: f.url,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt
        })),
        count: files.length
      },
      message: `Found **${files.length}** file(s).`
    };
  })
  .build();
