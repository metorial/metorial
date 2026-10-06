import { SlateTool } from 'slates';
import { z } from 'zod';
import { invoke } from '../lib/invocation';
import { fail } from '../lib/validation';
import { spec } from '../spec';

const outputSchema = z.object({
  nextPageUrl: z.string().optional().describe('Next native page, when present.'),
  exports: z
    .array(
      z.object({
        exportId: z.string().describe('Unique export identifier'),
        name: z.string().optional().describe('Export name'),
        type: z.string().optional().describe('Export type (e.g., webhook, test, delta)'),
        lastModified: z.string().optional().describe('Last modification timestamp'),
        connectionId: z.string().optional().describe('Associated connection ID')
      })
    )
    .describe('List of exports')
});

export let listExports = SlateTool.create(spec, {
  name: 'List Exports',
  key: 'list_exports',
  description: `Retrieve a page of exports in your Celigo account. Exports are used to extract data from an application and can run standalone or within a flow.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Maximum records on this native page.'),
      externalId: z.string().optional().describe('Exact native externalId filter.'),
      nextPageUrl: z
        .string()
        .optional()
        .describe('Next URL from the preceding page, with the same filters and limit.')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke('list_exports', ctx);
    const parsed = outputSchema.safeParse(result.output);
    if (!parsed.success)
      throw fail(
        'Celigo returned an invalid result. Reconcile any requested write before repeating it.'
      );
    return { ...result, output: parsed.data };
  })
  .build();
