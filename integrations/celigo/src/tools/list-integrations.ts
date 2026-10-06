import { SlateTool } from 'slates';
import { z } from 'zod';
import { invoke } from '../lib/invocation';
import { fail } from '../lib/validation';
import { spec } from '../spec';

const outputSchema = z.object({
  nextPageUrl: z.string().optional().describe('Next native page, when present.'),
  integrations: z
    .array(
      z.object({
        integrationId: z.string().describe('Unique integration identifier'),
        name: z.string().optional().describe('Integration name'),
        lastModified: z.string().optional().describe('Last modification timestamp'),
        readme: z.string().optional().describe('Integration description/readme')
      })
    )
    .describe('List of integrations')
});

export let listIntegrations = SlateTool.create(spec, {
  name: 'List Integrations',
  key: 'list_integrations',
  description: `Retrieve a page of integrations in your Celigo account. Integrations serve as organizational containers for flows and connections.`,
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
    const result = await invoke('list_integrations', ctx);
    const parsed = outputSchema.safeParse(result.output);
    if (!parsed.success)
      throw fail(
        'Celigo returned an invalid result. Reconcile any requested write before repeating it.'
      );
    return { ...result, output: parsed.data };
  })
  .build();
