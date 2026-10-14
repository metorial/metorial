import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { LeadBoxerClient } from '../lib/client';
import { leadString } from '../lib/responses';
import { accountEmailSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listDatasets = SlateTool.create(spec, {
  name: 'List Datasets',
  key: 'list_datasets',
  description:
    'List datasets accessible to the LeadBoxer account that owns your API key. Use the returned dataset IDs with lead retrieval, event tracking, or enrichment tools.',
  tags: { readOnly: true }
})
  .input(z.object({ accountEmail: accountEmailSchema }))
  .output(
    z.object({
      datasets: z.array(
        z.object({
          datasetId: z.string().describe('Dataset ID for subsequent tool calls'),
          name: z.string().optional().describe('Human-readable dataset name'),
          timezone: z.string().optional(),
          formTracking: z.boolean().optional(),
          formInputAttribute: z.string().optional(),
          allowIpMasking: z.boolean().optional(),
          createdAt: z.string().optional()
        })
      ),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new LeadBoxerClient({
      token: ctx.auth.token,
      accountEmail: ctx.input.accountEmail ?? ctx.auth.accountEmail
    });
    let page = await client.getDatasets();
    let datasets = page.data.map(dataset => {
      let datasetId = leadString(dataset.datasetId);
      if (!datasetId) {
        throw createApiServiceError('LeadBoxer returned a dataset without a dataset ID.', {
          reason: 'leadboxer_invalid_response'
        });
      }
      return {
        datasetId,
        name: leadString(dataset.humanName),
        timezone: leadString(dataset.timezone),
        formTracking:
          typeof dataset.formTracking === 'boolean' ? dataset.formTracking : undefined,
        formInputAttribute: leadString(dataset.formInputAttribute),
        allowIpMasking:
          typeof dataset.allowIpMasking === 'boolean' ? dataset.allowIpMasking : undefined,
        createdAt: leadString(dataset.createdTimestamp)
      };
    });
    return {
      output: { datasets, count: datasets.length },
      message: `Retrieved **${datasets.length}** accessible dataset(s).`
    };
  })
  .build();
