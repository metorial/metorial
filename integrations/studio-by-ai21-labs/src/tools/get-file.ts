import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFile = SlateTool.create(spec, {
  name: 'Get Library File',
  key: 'get_file',
  description: `Retrieve metadata for a specific file in your AI21 document library by its ID.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      fileId: z.string().describe('ID of the file to retrieve')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('Unique file identifier'),
      name: z.string().describe('File name'),
      fileType: z.string().optional().describe('File format'),
      sizeBytes: z.number().optional().describe('File size in bytes'),
      labels: z.array(z.string()).optional().describe('File labels'),
      status: z.string().optional().describe('File processing status'),
      publicUrl: z.string().optional().describe('Public source URL'),
      creationDate: z.string().optional().describe('Upload timestamp'),
      lastUpdated: z.string().optional().describe('Last update timestamp'),
      path: z.string().optional().describe('File path in library')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let f = await client.getFile(ctx.input.fileId);

    let output = {
      fileId: f.fileId ?? f.file_id ?? f.id,
      name: f.name ?? f.fileName,
      fileType: f.fileType ?? f.file_type,
      sizeBytes: f.sizeBytes ?? f.size_bytes,
      labels: f.labels,
      status: f.status,
      publicUrl: f.publicUrl ?? f.public_url,
      creationDate: f.creationDate ?? f.creation_date,
      lastUpdated: f.lastUpdated ?? f.last_updated,
      path: f.path
    };

    return {
      output,
      message: `Retrieved file **${output.name}** (${output.fileType ?? 'unknown type'}, ${output.status ?? 'unknown status'}).`
    };
  })
  .build();
