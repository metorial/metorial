import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExaClient } from '../lib/client';
import { spec } from '../spec';

let enrichmentSchema = z.object({
  enrichmentId: z.string().describe('Enrichment identifier'),
  status: z.string().describe('Enrichment status'),
  description: z.string().describe('Description of what data to extract'),
  format: z.string().optional().describe('Expected format of the enrichment value'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let createEnrichmentTool = SlateTool.create(spec, {
  name: 'Create Enrichment',
  key: 'create_enrichment',
  description: `Add an enrichment to a Webset. Enrichments are agents that search the web to enhance Webset items with additional structured data.
Define what data to extract and its expected format (text, number, date, etc.). The enrichment runs on all existing and future items.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      websetId: z.string().describe('The Webset ID to add the enrichment to'),
      description: z
        .string()
        .describe(
          'Description of the data to extract (e.g., "Find the company\'s founding year")'
        ),
      format: z
        .string()
        .optional()
        .describe('Native format: text, date, number, options, email, phone or url'),
      options: z
        .array(z.object({ label: z.string() }))
        .optional()
        .describe('Native option labels')
    })
  )
  .output(enrichmentSchema)
  .handleInvocation(async ctx => {
    let client = new ExaClient(ctx.auth.token, ctx.input);
    let result = await client.createEnrichment(ctx.input.websetId, {
      description: ctx.input.description,
      format: ctx.input.format,
      options: ctx.input.options
    });

    return {
      output: {
        enrichmentId: result.id,
        status: result.status,
        description: result.description,
        format: result.format,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      },
      message: `Created enrichment **${result.id}** on Webset **${ctx.input.websetId}**: "${ctx.input.description}".`
    };
  })
  .build();

export let updateEnrichmentTool = SlateTool.create(spec, {
  name: 'Update Enrichment',
  key: 'update_enrichment',
  description: `Update an enrichment's description or format on a Webset.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      websetId: z.string().describe('The Webset ID'),
      enrichmentId: z.string().describe('The enrichment ID to update'),
      description: z.string().optional().describe('New description'),
      format: z.string().optional().describe('New native format'),
      options: z
        .array(z.object({ label: z.string() }))
        .optional()
        .describe('Native option labels')
    })
  )
  .output(enrichmentSchema)
  .handleInvocation(async ctx => {
    let client = new ExaClient(ctx.auth.token, ctx.input);
    let result = await client.updateEnrichment(ctx.input.websetId, ctx.input.enrichmentId, {
      description: ctx.input.description,
      format: ctx.input.format,
      options: ctx.input.options
    });

    return {
      output: {
        enrichmentId: result.id,
        status: result.status,
        description: result.description,
        format: result.format,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      },
      message: `Updated enrichment **${result.id}** on Webset **${ctx.input.websetId}**.`
    };
  })
  .build();

export let deleteEnrichmentTool = SlateTool.create(spec, {
  name: 'Delete Enrichment',
  key: 'delete_enrichment',
  description: `Remove an enrichment from a Webset. Cancels a running enrichment and removes its existing enrichment results; this does not undo consumed credits or history.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      websetId: z.string().describe('The Webset ID'),
      enrichmentId: z.string().describe('The enrichment ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExaClient(ctx.auth.token, ctx.input);
    await client.deleteEnrichment(ctx.input.websetId, ctx.input.enrichmentId);

    return {
      output: { deleted: true },
      message: `Deleted enrichment **${ctx.input.enrichmentId}** from Webset **${ctx.input.websetId}**.`
    };
  })
  .build();
