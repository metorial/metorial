import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listScanUploads = SlateTool.create(spec, {
  key: 'list_scan_uploads',
  name: 'List Scan Uploads',
  description:
    'Find batches of scans uploaded from devices. Use an uploadId with retrieve_scans to retrieve the records in that upload. Supports limit and offset pagination.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      serviceId: z
        .string()
        .optional()
        .describe(
          'Service IDs, comma-separated, or all. Call list_services to discover services.'
        ),
      deviceId: z
        .string()
        .optional()
        .describe(
          'Device IDs, comma-separated, or all. Call list_devices to discover devices.'
        ),
      userId: z
        .string()
        .optional()
        .describe('User IDs, comma-separated, or all. Call list_users to discover users.'),
      limit: z
        .string()
        .optional()
        .describe('Maximum number of uploads to return, as an integer.'),
      offset: z.string().optional().describe('Number of results to skip. Requires limit.')
    })
  )
  .output(
    z.object({
      count: z.string(),
      uploads: z.array(
        z
          .object({
            uploadId: z.string(),
            device_id: z.string().optional(),
            service_id: z.string().optional(),
            user_id: z.string().optional(),
            status: z.string().optional(),
            count: z.string().optional(),
            timestamp: z.string().optional()
          })
          .passthrough()
      )
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth.token).retrieveUploads(ctx.input);
    return {
      output: result,
      message: `Found **${result.count}** scan upload(s). Returned **${result.uploads.length}** upload(s).`
    };
  })
  .build();
