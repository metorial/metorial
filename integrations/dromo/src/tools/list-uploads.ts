import { SlateTool } from 'slates';
import { z } from 'zod';
import { DromoClient } from '../lib/client';
import { spec } from '../spec';

export let listUploads = SlateTool.create(spec, {
  name: 'List Uploads',
  key: 'list_uploads',
  description: `Lists all completed imports (uploads) in your Dromo account. Returns an overview of each upload including status, row counts, and field information.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      uploads: z.array(
        z.object({
          uploadId: z.string().describe('Unique identifier of the upload'),
          status: z.string().describe('Current status of the upload'),
          totalRows: z.number().describe('Total number of data rows'),
          fieldOrder: z.array(z.string()).describe('Ordered list of field keys'),
          downloadUrl: z.string().optional().describe('Pre-signed URL to download the data')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new DromoClient({ token: ctx.auth.token });
    let uploads = await client.listUploads();

    let mapped = uploads.map(u => ({
      uploadId: u.id,
      status: u.upload_status,
      totalRows: u.total_num_rows,
      fieldOrder: u.field_order,
      downloadUrl: u.download_url
    }));

    return {
      output: { uploads: mapped },
      message: `Found **${mapped.length}** upload(s).`
    };
  })
  .build();
