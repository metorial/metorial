import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let opportunityOutputSchema = z.object({
  opportunityId: z.number().describe('Unique ID of the opportunity'),
  name: z.string().nullable().describe('Opportunity name'),
  assigneeId: z.number().nullable().optional().describe('Assigned user ID'),
  companyId: z.number().nullable().optional().describe('Associated company ID'),
  companyName: z.string().nullable().optional().describe('Associated company name'),
  primaryContactId: z.number().nullable().optional().describe('Primary contact person ID'),
  pipelineId: z.number().nullable().optional().describe('Pipeline ID'),
  pipelineStageId: z.number().nullable().optional().describe('Pipeline stage ID'),
  status: z.string().nullable().optional().describe('Status: Open, Won, Lost, or Abandoned'),
  monetaryValue: z.number().nullable().optional().describe('Monetary value'),
  winProbability: z.number().nullable().optional().describe('Win probability (0-100)'),
  closeDate: z.string().nullable().optional().describe('Expected close date'),
  customerSourceId: z.number().nullable().optional().describe('Customer source ID'),
  lossReasonId: z.number().nullable().optional().describe('Loss reason ID'),
  priority: z.string().nullable().optional().describe('Priority level'),
  tags: z.array(z.string()).optional().describe('Tags'),
  details: z.string().nullable().optional().describe('Additional details'),
  dateCreated: z.number().nullable().optional().describe('Creation timestamp (Unix)'),
  dateModified: z.number().nullable().optional().describe('Last modified timestamp (Unix)'),
  customFields: z.array(z.any()).optional().describe('Custom field values'),
  interactionCount: z.number().nullable().optional().describe('Total interaction count')
});

let mapOpportunity = (o: any) => ({
  opportunityId: o.id,
  name: o.name,
  assigneeId: o.assignee_id,
  companyId: o.company_id,
  companyName: o.company_name,
  primaryContactId: o.primary_contact_id,
  pipelineId: o.pipeline_id,
  pipelineStageId: o.pipeline_stage_id,
  status: o.status,
  monetaryValue: o.monetary_value,
  winProbability: o.win_probability,
  closeDate: o.close_date,
  customerSourceId: o.customer_source_id,
  lossReasonId: o.loss_reason_id,
  priority: o.priority,
  tags: o.tags,
  details: o.details,
  dateCreated: o.date_created,
  dateModified: o.date_modified,
  customFields: o.custom_fields,
  interactionCount: o.interaction_count
});

export let createOpportunity = SlateTool.create(spec, {
  name: 'Create Opportunity',
  key: 'create_opportunity',
  description: `Create a new opportunity (deal) in Copper CRM. Opportunities track sales deals through configurable pipelines with stages and can be associated with contacts and companies.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      name: z.string().describe('Opportunity name'),
      primaryContactId: z.number().optional().describe('ID of the primary contact person'),
      companyId: z.number().optional().describe('ID of the associated company'),
      pipelineId: z
        .number()
        .optional()
        .describe('Pipeline ID (defaults to the account default pipeline)'),
      pipelineStageId: z.number().optional().describe('Pipeline stage ID'),
      assigneeId: z.number().optional().describe('User ID to assign the opportunity to'),
      monetaryValue: z.number().optional().describe('Monetary value of the deal'),
      winProbability: z.number().optional().describe('Win probability (0-100)'),
      closeDate: z
        .string()
        .optional()
        .describe('Expected close date (MM/DD/YYYY format or Unix timestamp)'),
      customerSourceId: z.number().optional().describe('Customer source ID'),
      priority: z.string().optional().describe('Priority: "None", "Low", "Medium", or "High"'),
      details: z.string().optional().describe('Additional notes'),
      tags: z.array(z.string()).optional().describe('Tags'),
      customFields: z
        .array(
          z.object({
            customFieldDefinitionId: z.number(),
            value: z.any()
          })
        )
        .optional()
        .describe('Custom field values')
    })
  )
  .output(opportunityOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let body: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.primaryContactId) body.primary_contact_id = ctx.input.primaryContactId;
    if (ctx.input.companyId) body.company_id = ctx.input.companyId;
    if (ctx.input.pipelineId) body.pipeline_id = ctx.input.pipelineId;
    if (ctx.input.pipelineStageId) body.pipeline_stage_id = ctx.input.pipelineStageId;
    if (ctx.input.assigneeId) body.assignee_id = ctx.input.assigneeId;
    if (ctx.input.monetaryValue !== undefined) body.monetary_value = ctx.input.monetaryValue;
    if (ctx.input.winProbability !== undefined)
      body.win_probability = ctx.input.winProbability;
    if (ctx.input.closeDate) body.close_date = ctx.input.closeDate;
    if (ctx.input.customerSourceId) body.customer_source_id = ctx.input.customerSourceId;
    if (ctx.input.priority) body.priority = ctx.input.priority;
    if (ctx.input.details) body.details = ctx.input.details;
    if (ctx.input.tags) body.tags = ctx.input.tags;
    if (ctx.input.customFields) {
      body.custom_fields = ctx.input.customFields.map(cf => ({
        custom_field_definition_id: cf.customFieldDefinitionId,
        value: cf.value
      }));
    }

    let opportunity = await client.createOpportunity(body);

    return {
      output: mapOpportunity(opportunity),
      message: `Created opportunity **${opportunity.name}** (ID: ${opportunity.id}).`
    };
  })
  .build();

export let getOpportunity = SlateTool.create(spec, {
  name: 'Get Opportunity',
  key: 'get_opportunity',
  description: `Retrieve an opportunity record by its ID. Returns full deal details including pipeline, stage, monetary value, and custom fields.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      opportunityId: z.number().describe('ID of the opportunity to retrieve')
    })
  )
  .output(opportunityOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let opportunity = await client.getOpportunity(ctx.input.opportunityId);

    return {
      output: mapOpportunity(opportunity),
      message: `Retrieved opportunity **${opportunity.name}** (ID: ${opportunity.id}).`
    };
  })
  .build();

export let updateOpportunity = SlateTool.create(spec, {
  name: 'Update Opportunity',
  key: 'update_opportunity',
  description: `Update an existing opportunity in Copper CRM. Only provided fields will be updated. Use this to move deals through pipeline stages, update values, or change status.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      opportunityId: z.number().describe('ID of the opportunity to update'),
      name: z.string().optional().describe('Updated name'),
      primaryContactId: z.number().optional().describe('Updated primary contact ID'),
      companyId: z.number().optional().describe('Updated company ID'),
      pipelineId: z.number().optional().describe('Updated pipeline ID'),
      pipelineStageId: z.number().optional().describe('Updated pipeline stage ID'),
      assigneeId: z.number().optional().describe('Updated assignee user ID'),
      monetaryValue: z.number().optional().describe('Updated monetary value'),
      winProbability: z.number().optional().describe('Updated win probability (0-100)'),
      closeDate: z.string().optional().describe('Updated close date'),
      customerSourceId: z.number().optional().describe('Updated customer source ID'),
      lossReasonId: z.number().optional().describe('Loss reason ID (for lost deals)'),
      status: z
        .string()
        .optional()
        .describe('Updated status: "Open", "Won", "Lost", or "Abandoned"'),
      priority: z.string().optional().describe('Updated priority'),
      details: z.string().optional().describe('Updated notes'),
      tags: z.array(z.string()).optional().describe('Updated tags'),
      customFields: z
        .array(
          z.object({
            customFieldDefinitionId: z.number(),
            value: z.any()
          })
        )
        .optional()
        .describe('Updated custom fields')
    })
  )
  .output(opportunityOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let body: Record<string, any> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.primaryContactId !== undefined)
      body.primary_contact_id = ctx.input.primaryContactId;
    if (ctx.input.companyId !== undefined) body.company_id = ctx.input.companyId;
    if (ctx.input.pipelineId !== undefined) body.pipeline_id = ctx.input.pipelineId;
    if (ctx.input.pipelineStageId !== undefined)
      body.pipeline_stage_id = ctx.input.pipelineStageId;
    if (ctx.input.assigneeId !== undefined) body.assignee_id = ctx.input.assigneeId;
    if (ctx.input.monetaryValue !== undefined) body.monetary_value = ctx.input.monetaryValue;
    if (ctx.input.winProbability !== undefined)
      body.win_probability = ctx.input.winProbability;
    if (ctx.input.closeDate !== undefined) body.close_date = ctx.input.closeDate;
    if (ctx.input.customerSourceId !== undefined)
      body.customer_source_id = ctx.input.customerSourceId;
    if (ctx.input.lossReasonId !== undefined) body.loss_reason_id = ctx.input.lossReasonId;
    if (ctx.input.status !== undefined) body.status = ctx.input.status;
    if (ctx.input.priority !== undefined) body.priority = ctx.input.priority;
    if (ctx.input.details !== undefined) body.details = ctx.input.details;
    if (ctx.input.tags !== undefined) body.tags = ctx.input.tags;
    if (ctx.input.customFields !== undefined) {
      body.custom_fields = ctx.input.customFields.map(cf => ({
        custom_field_definition_id: cf.customFieldDefinitionId,
        value: cf.value
      }));
    }

    let opportunity = await client.updateOpportunity(ctx.input.opportunityId, body);

    return {
      output: mapOpportunity(opportunity),
      message: `Updated opportunity **${opportunity.name}** (ID: ${opportunity.id}).`
    };
  })
  .build();

export let deleteOpportunity = SlateTool.create(spec, {
  name: 'Delete Opportunity',
  key: 'delete_opportunity',
  description: `Permanently delete an opportunity record from Copper CRM. This action cannot be undone.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      opportunityId: z.number().describe('ID of the opportunity to delete')
    })
  )
  .output(
    z.object({
      opportunityId: z.number().describe('ID of the deleted opportunity'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    await client.deleteOpportunity(ctx.input.opportunityId);

    return {
      output: { opportunityId: ctx.input.opportunityId, deleted: true },
      message: `Deleted opportunity with ID ${ctx.input.opportunityId}.`
    };
  })
  .build();

export let searchOpportunities = SlateTool.create(spec, {
  name: 'Search Opportunities',
  key: 'search_opportunities',
  description: `Search for opportunities in Copper CRM with flexible filtering. Supports filtering by name, pipeline, status, assignee, company, value range, close date range, and more.`,
  constraints: ['Maximum 200 results per page', 'Maximum 100,000 total results per search'],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      pageNumber: z.number().optional().default(1).describe('Page number (starting at 1)'),
      pageSize: z.number().optional().default(20).describe('Results per page (max 200)'),
      sortBy: z
        .string()
        .optional()
        .describe(
          'Field to sort by: name, assignee, company_name, status, monetary_value, close_date'
        ),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      name: z.string().optional().describe('Filter by name'),
      assigneeIds: z.array(z.number()).optional().describe('Filter by assignee user IDs'),
      pipelineIds: z.array(z.number()).optional().describe('Filter by pipeline IDs'),
      statusIds: z.array(z.number()).optional().describe('Filter by status IDs'),
      companyIds: z.array(z.number()).optional().describe('Filter by company IDs'),
      customerSourceIds: z
        .array(z.number())
        .optional()
        .describe('Filter by customer source IDs'),
      lossReasonIds: z.array(z.number()).optional().describe('Filter by loss reason IDs'),
      minimumMonetaryValue: z.number().optional().describe('Minimum monetary value'),
      maximumMonetaryValue: z.number().optional().describe('Maximum monetary value'),
      minimumCloseDate: z.string().optional().describe('Minimum close date (Unix timestamp)'),
      maximumCloseDate: z.string().optional().describe('Maximum close date (Unix timestamp)'),
      tags: z.array(z.string()).optional().describe('Filter by tags')
    })
  )
  .output(
    z.object({
      opportunities: z.array(opportunityOutputSchema).describe('Matching opportunity records'),
      count: z.number().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let body: Record<string, any> = {
      page_number: ctx.input.pageNumber,
      page_size: ctx.input.pageSize
    };
    if (ctx.input.sortBy) body.sort_by = ctx.input.sortBy;
    if (ctx.input.sortDirection) body.sort_direction = ctx.input.sortDirection;
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.assigneeIds) body.assignee_ids = ctx.input.assigneeIds;
    if (ctx.input.pipelineIds) body.pipeline_ids = ctx.input.pipelineIds;
    if (ctx.input.statusIds) body.status_ids = ctx.input.statusIds;
    if (ctx.input.companyIds) body.company_ids = ctx.input.companyIds;
    if (ctx.input.customerSourceIds) body.customer_source_ids = ctx.input.customerSourceIds;
    if (ctx.input.lossReasonIds) body.loss_reason_ids = ctx.input.lossReasonIds;
    if (ctx.input.minimumMonetaryValue !== undefined)
      body.minimum_monetary_value = ctx.input.minimumMonetaryValue;
    if (ctx.input.maximumMonetaryValue !== undefined)
      body.maximum_monetary_value = ctx.input.maximumMonetaryValue;
    if (ctx.input.minimumCloseDate) body.minimum_close_date = ctx.input.minimumCloseDate;
    if (ctx.input.maximumCloseDate) body.maximum_close_date = ctx.input.maximumCloseDate;
    if (ctx.input.tags) body.tags = ctx.input.tags;

    let opportunities = await client.searchOpportunities(body);

    return {
      output: {
        opportunities: opportunities.map(mapOpportunity),
        count: opportunities.length
      },
      message: `Found **${opportunities.length}** opportunities matching the search criteria.`
    };
  })
  .build();
