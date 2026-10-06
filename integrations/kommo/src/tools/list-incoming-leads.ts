import { SlateTool } from 'slates';
import { z } from 'zod';
import { KommoClient } from '../lib/client';
import { spec } from '../spec';

export let listIncomingLeadsTool = SlateTool.create(spec, {
  name: 'List Incoming Leads',
  key: 'list_incoming_leads',
  description:
    'List incoming leads awaiting processing. Discover their UIDs, sources, pipeline, and linked CRM records before accepting or declining them with manage_incoming_lead.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      uids: z.array(z.string().min(1)).optional().describe('Filter by incoming lead UIDs'),
      categories: z
        .array(z.enum(['sip', 'mail', 'chats', 'forms']))
        .optional()
        .describe('Filter by source categories'),
      pipelineId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Pipeline ID from list_pipelines'),
      orderDir: z.enum(['asc', 'desc']).optional().describe('Sort by creation time'),
      page: z.number().int().min(1).optional().describe('Page number, starting at 1'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(250)
        .optional()
        .describe('Results per page, up to 250')
    })
  )
  .output(
    z.object({
      incomingLeads: z.array(
        z.object({
          uid: z.string().describe('Incoming lead UID for manage_incoming_lead'),
          sourceUid: z.string().optional(),
          sourceName: z.string().optional(),
          category: z.string(),
          pipelineId: z.number(),
          createdAt: z.number(),
          metadata: z.unknown().optional().describe('Source-specific details'),
          leadIds: z.array(z.number()),
          contactIds: z.array(z.number()),
          companyIds: z.array(z.number())
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new KommoClient({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain || (ctx.config as { subdomain?: string }).subdomain
    });
    let leads = await client.listIncomingLeads(ctx.input, {
      page: ctx.input.page,
      limit: ctx.input.limit
    });
    let incomingLeads = leads.map((lead: any) => ({
      uid: lead.uid,
      sourceUid: lead.source_uid,
      sourceName: lead.source_name,
      category: lead.category,
      pipelineId: lead.pipeline_id,
      createdAt: lead.created_at,
      metadata: lead.metadata,
      leadIds: (lead._embedded?.leads || []).map((record: { id: number }) => record.id),
      contactIds: (lead._embedded?.contacts || []).map((record: { id: number }) => record.id),
      companyIds: (lead._embedded?.companies || []).map((record: { id: number }) => record.id)
    }));
    return {
      output: { incomingLeads },
      message: `Found **${incomingLeads.length}** incoming lead(s).`
    };
  })
  .build();
