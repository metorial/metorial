import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLead = SlateTool.create(spec, {
  name: 'Get Lead',
  key: 'get_lead',
  description: `Get detailed information about a specific lead by ID, including its opportunities and quotes. Returns full lead details such as contact info, status, pipeline position, custom fields, tags, and associated opportunities and quotes.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      leadId: z.string().describe('Unique identifier of the lead to retrieve')
    })
  )
  .output(
    z.object({
      leadId: z.string().describe('Unique identifier of the lead'),
      firstName: z.string().optional().describe('First name of the lead'),
      lastName: z.string().optional().describe('Last name of the lead'),
      email: z.string().optional().describe('Email address of the lead'),
      phone: z.string().optional().describe('Phone number of the lead'),
      status: z.string().optional().describe('Current status of the lead'),
      producer: z.any().optional().describe('Producer (agent) assigned to the lead'),
      leadSource: z.any().optional().describe('Source through which the lead was acquired'),
      pipelineId: z.string().optional().describe('ID of the pipeline the lead belongs to'),
      stageId: z.string().optional().describe('ID of the current pipeline stage'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom fields associated with the lead'),
      tags: z.array(z.string()).optional().describe('Tags applied to the lead'),
      createdAt: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when the lead was created'),
      updatedAt: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when the lead was last updated'),
      rawLead: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Original lead record returned by AgencyZoom, preserving provider-specific fields.'
        ),
      opportunities: z
        .array(z.record(z.string(), z.any()))
        .describe('Opportunities associated with this lead'),
      quotes: z
        .array(z.record(z.string(), z.any()))
        .describe('Quotes associated with this lead')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let [lead, opportunitiesResult, quotesResult] = await Promise.all([
      client.getLead(ctx.input.leadId),
      client.getLeadOpportunities(ctx.input.leadId),
      client.getLeadQuotes(ctx.input.leadId)
    ]);

    let opportunities = Array.isArray(opportunitiesResult.data)
      ? opportunitiesResult.data
      : Array.isArray(opportunitiesResult)
        ? opportunitiesResult
        : [];
    let quotes = Array.isArray(quotesResult.data)
      ? quotesResult.data
      : Array.isArray(quotesResult)
        ? quotesResult
        : [];

    let leadData = lead.data ?? lead;
    let fields = Array.isArray(leadData.customFields)
      ? Object.fromEntries(
          leadData.customFields.map((field: Record<string, any>) => [
            field.fieldName,
            field.fieldValue
          ])
        )
      : leadData.customFields;
    let tags = await client.resolveTagNames(leadData.tags ?? leadData.tagNames);
    let statuses: Record<number, string> = {
      0: 'new',
      1: 'quoted',
      2: 'won',
      3: 'lost',
      4: 'contacted',
      5: 'x-dated'
    };

    return {
      output: {
        leadId: String(leadData.leadId ?? leadData.id ?? ctx.input.leadId),
        firstName: leadData.firstName ?? leadData.firstname,
        lastName: leadData.lastName ?? leadData.lastname,
        email: leadData.email,
        phone: leadData.phone,
        status:
          typeof leadData.status === 'number'
            ? (statuses[leadData.status] ?? String(leadData.status))
            : leadData.status,
        producer: leadData.producer ?? {
          id: leadData.assignedTo,
          firstName: leadData.assignToFirstname,
          lastName: leadData.assignToLastname
        },
        leadSource: leadData.leadSource ?? {
          id: leadData.leadSourceId,
          name: leadData.leadSourceName
        },
        pipelineId:
          leadData.pipelineId != null || leadData.workflowId != null
            ? String(leadData.pipelineId ?? leadData.workflowId)
            : undefined,
        stageId:
          leadData.stageId != null || leadData.workflowStageId != null
            ? String(leadData.stageId ?? leadData.workflowStageId)
            : undefined,
        customFields: fields,
        tags,
        createdAt: leadData.createdAt ?? leadData.createDate,
        updatedAt: leadData.updatedAt ?? leadData.modifyDate,
        rawLead: leadData,
        opportunities,
        quotes
      },
      message: `Retrieved lead **${leadData.firstName ?? leadData.firstname ?? ''} ${leadData.lastName ?? leadData.lastname ?? ''}** (${ctx.input.leadId}) with **${opportunities.length}** opportunity(ies) and **${quotes.length}** quote(s).`
    };
  })
  .build();
