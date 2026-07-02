import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let resolveErrors = SlateTool.create(spec, {
  name: 'Resolve Errors',
  key: 'resolve_errors',
  description: `Mark one or more flow errors as resolved. Provide the error IDs from the errors list returned by the Get Flow Errors tool.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      flowId: z.string().describe('ID of the flow'),
      processorId: z.string().describe('ID of the export or import step'),
      errorIds: z.array(z.string()).describe('List of error IDs to resolve')
    })
  )
  .output(
    z.object({
      resolved: z.boolean().describe('Whether the errors were successfully resolved'),
      rawResult: z.any().optional().describe('API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.resolveErrors(
      ctx.input.flowId,
      ctx.input.processorId,
      ctx.input.errorIds
    );

    return {
      output: {
        resolved: true,
        rawResult: result
      },
      message: `Resolved **${ctx.input.errorIds.length}** error(s) for flow **${ctx.input.flowId}** / processor **${ctx.input.processorId}**.`
    };
  })
  .build();
