import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { invalid, page, pagination, type Row } from '../lib/contracts';
import { spec } from '../spec';

export let getPipelineMetadataTool = SlateTool.create(spec, {
  name: 'Get Pipeline Metadata',
  key: 'get_pipeline_metadata',
  description: `Retrieve pipeline configuration metadata from Lever including stages, archive reasons, sources, and tags. Select which types of metadata to fetch. Useful for looking up stage IDs, archive reason IDs, and available tags/sources.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Page size from 1 to 100'),
      offset: z
        .string()
        .optional()
        .describe('Cursor for one selected resource type from its previous response'),
      include: z
        .array(z.enum(['stages', 'archiveReasons', 'sources', 'tags']))
        .describe('Types of metadata to include')
    })
  )
  .output(
    z.object({
      pagination: z
        .record(z.string(), z.object({ hasNext: z.boolean(), next: z.string().optional() }))
        .optional()
        .describe('Paging state for each selected resource type'),
      stages: z.array(z.any()).optional().describe('Pipeline stages'),
      archiveReasons: z.array(z.any()).optional().describe('Archive reasons'),
      sources: z.array(z.any()).optional().describe('Candidate sources'),
      tags: z.array(z.any()).optional().describe('Tags')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.offset !== undefined && new Set(ctx.input.include).size !== 1)
      invalid(
        'A pagination cursor belongs to one resource type. Select exactly one type when using offset.'
      );
    if (!ctx.input.include.length) invalid('Choose at least one metadata type.');
    const client = new Client(ctx.auth);
    const output: {
      stages?: Row[];
      archiveReasons?: Row[];
      sources?: Row[];
      tags?: Row[];
      pagination: Record<string, { hasNext: boolean; next?: string }>;
    } = { pagination: {} };
    const params = pagination(ctx.input);
    for (const type of new Set(ctx.input.include)) {
      const result = page(
        await (type === 'stages'
          ? client.listStages(params)
          : type === 'archiveReasons'
            ? client.listArchiveReasons(params)
            : type === 'sources'
              ? client.listSources(params)
              : client.listTags(params))
      );
      output[type] = result.data;
      output.pagination[type] = { hasNext: result.hasNext, next: result.next };
    }
    return {
      output,
      message: `Retrieved the selected metadata page. Follow each resource type's cursor separately.`
    };
  })
  .build();
