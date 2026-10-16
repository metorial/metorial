import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProcess = SlateTool.create(spec, {
  name: 'Get Bulk Operation Status',
  key: 'get_process',
  description:
    'Check the progress and per-pass failures of an asynchronous bulk update. Supply the process ID or processUrl returned by bulk_update_passes.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      processId: z
        .string()
        .describe('Process identifier or the processUrl returned by bulk_update_passes')
    })
  )
  .output(
    z.object({
      process: z
        .record(z.string(), z.any())
        .describe(
          'Raw process details including current, total, status, createdOn, and per-item errors'
        )
    })
  )
  .handleInvocation(async ctx => {
    let processId = ctx.input.processId;
    if (processId.includes('/')) {
      let match = /^https:\/\/app\.passcreator\.com\/api\/v3\/process\/([^/?#]+)$/.exec(
        processId
      );
      if (!match?.[1]) {
        throw createApiServiceError(
          'Provide a process ID or the process URL returned by bulk_update_passes.'
        );
      }
      processId = match[1];
    }
    if (!processId.trim()) {
      throw createApiServiceError('A process ID is required.');
    }
    let result = await new Client({ token: ctx.auth.token }).getProcess(processId);
    let process = result.data ?? result;
    return {
      output: { process },
      message: `Bulk operation: ${process.status}. Processed ${process.current} of ${process.total} pass(es).`
    };
  })
  .build();
