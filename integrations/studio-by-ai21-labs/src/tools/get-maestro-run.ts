import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapRun, runOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export const getMaestroRun = SlateTool.create(spec, {
  name: 'Get Maestro Run',
  key: 'get_maestro_run',
  description:
    'Retrieve a Maestro run by its runId to check asynchronous status, generated output, validation results, and failure details.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ runId: z.string().min(1).describe('Run ID returned by maestro_run') }))
  .output(runOutputSchema)
  .handleInvocation(async ctx => {
    const output = mapRun(await new Client(ctx.auth).getMaestroRun(ctx.input.runId));
    return {
      output,
      message: `Maestro run **${output.runId}** has status **${output.status}**.`
    };
  })
  .build();
