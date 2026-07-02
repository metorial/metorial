import { SlateTool } from 'slates';
import { z } from 'zod';
import { KommoClient } from '../lib/client';
import { leadOutputSchema, mapLead } from '../lib/schemas';
import { spec } from '../spec';

export let listLeadsTool = SlateTool.create(spec, {
  name: 'List Leads',
  key: 'list_leads',
  description: `Search and list sales leads in Kommo. Supports filtering by search query, pipeline, responsible user, and lead IDs. Returns leads with their pipeline stage, price, tags, and custom fields.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().optional().describe('Full-text search query across lead fields'),
      pipelineIds: z.array(z.number()).optional().describe('Filter by pipeline IDs'),
      responsibleUserIds: z
        .array(z.number())
        .optional()
        .describe('Filter by responsible user IDs'),
      leadIds: z.array(z.number()).optional().describe('Filter by specific lead IDs'),
      orderBy: z.enum(['created_at', 'updated_at', 'id']).optional().describe('Sort field'),
      orderDir: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Results per page (max 250)')
    })
  )
  .output(
    z.object({
      leads: z.array(leadOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new KommoClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let leads = await client.listLeads(
      {
        query: ctx.input.query,
        pipelineIds: ctx.input.pipelineIds,
        responsibleUserIds: ctx.input.responsibleUserIds,
        ids: ctx.input.leadIds,
        orderBy: ctx.input.orderBy,
        orderDir: ctx.input.orderDir
      },
      { page: ctx.input.page, limit: ctx.input.limit }
    );

    let mapped = leads.map(mapLead);

    return {
      output: { leads: mapped },
      message: `Found **${mapped.length}** lead(s).`
    };
  })
  .build();
