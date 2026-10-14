import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  modelingRequestSchema,
  paginationInputFields,
  paginationSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let listModelingRequests = SlateTool.create(spec, {
  name: 'List Modeling Requests',
  key: 'list_modeling_requests',
  description:
    'List a page of modeling requests and their production or review status. Optionally filter by workspace, text, SKU, batch, title, or status. Call list_workspaces to discover workspace IDs.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      ...paginationInputFields,
      workspaceId: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe(
          'Numeric workspace ID. Call list_workspaces to discover authorized workspace IDs.'
        ),
      keywords: z.string().optional().describe('Search titles, SKUs, and batch identifiers.'),
      sku: z.string().optional().describe('Filter by SKU.'),
      batchUid: z.string().optional().describe('Filter by modeling batch identifier.'),
      title: z.string().optional().describe('Filter by request title.'),
      status: z
        .enum([
          'in_quoting',
          'in_progress',
          'ready_for_review',
          'adjustments_in_progress',
          'dispute_review',
          'preparing_for_delivery',
          'finished'
        ])
        .optional()
        .describe('Filter by the current production status.'),
      sortBy: z
        .array(z.string())
        .length(2)
        .optional()
        .describe(
          'Sort attribute and direction, for example ["created_at", "desc"]. Attributes: sku, batch_uid, title, finished_at, created_at. Direction: asc or desc.'
        )
    })
  )
  .output(
    z.object({
      modelingRequests: z
        .array(modelingRequestSchema)
        .describe(
          'Modeling request IDs and provider attributes, including status and review details when available.'
        ),
      pagination: paginationSchema
        .optional()
        .describe('Pagination metadata returned by Modelry.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listModelingRequests(ctx.input);
    return {
      output: { modelingRequests: result.data, pagination: result.meta },
      message: `Found **${result.data.length}** modeling request(s).`
    };
  })
  .build();
