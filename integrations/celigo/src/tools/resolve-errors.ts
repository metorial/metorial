import { SlateTool } from 'slates';
import { z } from 'zod';
import { invoke } from '../lib/invocation';
import { fail } from '../lib/validation';
import { spec } from '../spec';

const outputSchema = z.object({
  resolved: z.boolean().describe('Whether the errors were successfully resolved'),
  rawResult: z.any().optional().describe('API response')
});

export let resolveErrors = SlateTool.create(spec, {
  name: 'Resolve Errors',
  key: 'resolve_errors',
  description: `Mark one or more flow errors as resolved. Provide the error IDs from the errors list returned by the Get Flow Errors tool.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      flowId: z.string().describe('ID of the flow'),
      processorId: z.string().describe('ID of the export or import step'),
      errorIds: z.array(z.string()).describe('List of error IDs to resolve')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke('resolve_errors', ctx);
    const parsed = outputSchema.safeParse(result.output);
    if (!parsed.success)
      throw fail(
        'Celigo returned an invalid result. Reconcile any requested write before repeating it.'
      );
    return { ...result, output: parsed.data };
  })
  .build();
