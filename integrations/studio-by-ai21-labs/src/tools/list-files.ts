import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFiles = SlateTool.create(spec, {
  name: 'List Library Files',
  key: 'list_files',
  description: `List files in your AI21 document library. Optionally filter by labels. Returns file metadata including name, type, size, status, and labels.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      labels: z
        .array(z.string())
        .optional()
        .describe('Filter by these labels (case-sensitive)'),
      offset: z.number().int().optional().describe('Pagination offset'),
      limit: z.number().int().optional().describe('Maximum number of files to return')
    })
  )
  .output(
    z.object({
      files: z
        .array(
          z.object({
            fileId: z.string().describe('Unique file identifier'),
            name: z.string().describe('File name'),
            fileType: z.string().optional().describe('File format'),
            sizeBytes: z.number().optional().describe('File size in bytes'),
            labels: z.array(z.string()).optional().describe('File labels'),
            status: z.string().optional().describe('File processing status'),
            publicUrl: z.string().optional().describe('Public source URL'),
            creationDate: z.string().optional().describe('Upload timestamp'),
            lastUpdated: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('List of files')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listFiles({
      labels: ctx.input.labels,
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let files = (Array.isArray(result) ? result : (result.files ?? result.data ?? [])).map(
      (f: any) => ({
        fileId: f.fileId ?? f.file_id ?? f.id,
        name: f.name ?? f.fileName,
        fileType: f.fileType ?? f.file_type,
        sizeBytes: f.sizeBytes ?? f.size_bytes,
        labels: f.labels,
        status: f.status,
        publicUrl: f.publicUrl ?? f.public_url,
        creationDate: f.creationDate ?? f.creation_date,
        lastUpdated: f.lastUpdated ?? f.last_updated
      })
    );

    return {
      output: { files },
      message: `Found **${files.length}** file(s) in the library.`
    };
  })
  .build();
