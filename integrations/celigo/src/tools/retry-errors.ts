import { SlateTool } from 'slates';
import { z } from 'zod';
import { invoke } from '../lib/invocation';
import { fail } from '../lib/validation';
import { spec } from '../spec';

const outputSchema = z.object({
  jobId: z.string().optional(),
  retried: z.boolean().describe('Whether a native retry job was queued'),
  rawResult: z.any().optional().describe('API response')
});

export let retryErrors = SlateTool.create(spec, {
  name: 'Retry Errors',
  key: 'retry_errors',
  description: `Retry one or more flow errors. Provide the retryDataKeys from the error objects returned by the Get Flow Errors tool.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      flowId: z.string().describe('ID of the flow'),
      processorId: z.string().describe('ID of the export or import step'),
      retryDataKeys: z
        .array(z.string())
        .describe('List of retryDataKey values from the error objects to retry')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke('retry_errors', ctx);
    const parsed = outputSchema.safeParse(result.output);
    if (!parsed.success)
      throw fail(
        'Celigo returned an invalid result. Reconcile any requested write before repeating it.'
      );
    return { ...result, output: parsed.data };
  })
  .build();
