import { SlateTool } from 'slates';
import { z } from 'zod';
import { invoke } from '../lib/invocation';
import { fail } from '../lib/validation';
import { spec } from '../spec';

const outputSchema = z.object({
  nextPageUrl: z.string().optional().describe('Next native page, when present.'),
  imports: z
    .array(
      z.object({
        importId: z.string().describe('Unique import identifier'),
        name: z.string().optional().describe('Import name'),
        lastModified: z.string().optional().describe('Last modification timestamp'),
        connectionId: z.string().optional().describe('Associated connection ID')
      })
    )
    .describe('List of imports')
});

export let listImports = SlateTool.create(spec, {
  name: 'List Imports',
  key: 'list_imports',
  description: `Retrieve a page of imports in your Celigo account. Imports are used to insert data into an application and can run standalone or within a flow.`,
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
    const result = await invoke('list_imports', ctx);
    const parsed = outputSchema.safeParse(result.output);
    if (!parsed.success)
      throw fail(
        'Celigo returned an invalid result. Reconcile any requested write before repeating it.'
      );
    return { ...result, output: parsed.data };
  })
  .build();
