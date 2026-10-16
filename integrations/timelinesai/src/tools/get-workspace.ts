import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getWorkspace = SlateTool.create(spec, {
  name: 'Get Workspace',
  key: 'get_workspace',
  description:
    'Retrieve the workspace identity, plan, and current quota utilization for the connected API token.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      workspace: z
        .record(z.string(), z.unknown())
        .describe('Workspace details returned by TimelinesAI')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getWorkspace();
    if (!isApiErrorRecord(result?.data)) {
      throw createApiServiceError('TimelinesAI did not return workspace details.');
    }
    return {
      output: { workspace: result.data },
      message: 'Retrieved the connected workspace.'
    };
  })
  .build();
