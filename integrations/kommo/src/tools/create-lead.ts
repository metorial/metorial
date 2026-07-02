import { SlateTool } from 'slates';
import { z } from 'zod';
import { KommoClient } from '../lib/client';
import {
  buildCustomFieldsPayload,
  buildTagsPayload,
  customFieldValueSchema,
  tagSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let createLeadTool = SlateTool.create(spec, {
  name: 'Create Lead',
  key: 'create_lead',
  description: `Create a new sales lead in Kommo. Optionally link it to a pipeline/stage, assign a responsible user, set a price, add tags, and set custom field values. Can also create associated contacts and companies in a single operation using the complex mode.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Lead name'),
      price: z.number().optional().describe('Deal value/price'),
      statusId: z
        .number()
        .optional()
        .describe('Pipeline stage/status ID to place the lead in'),
      pipelineId: z.number().optional().describe('Pipeline ID'),
      responsibleUserId: z.number().optional().describe('ID of the responsible user'),
      tags: z.array(tagSchema).optional().describe('Tags to attach to the lead'),
      customFieldsValues: z
        .array(customFieldValueSchema)
        .optional()
        .describe('Custom field values'),
      contactId: z.number().optional().describe('ID of an existing contact to link'),
      companyId: z.number().optional().describe('ID of an existing company to link')
    })
  )
  .output(
    z.object({
      leadId: z.number().describe('ID of the created lead')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KommoClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let payload: Record<string, any> = {
      name: ctx.input.name
    };

    if (ctx.input.price !== undefined) payload.price = ctx.input.price;
    if (ctx.input.statusId) payload.status_id = ctx.input.statusId;
    if (ctx.input.pipelineId) payload.pipeline_id = ctx.input.pipelineId;
    if (ctx.input.responsibleUserId) payload.responsible_user_id = ctx.input.responsibleUserId;

    if (ctx.input.customFieldsValues?.length) {
      payload.custom_fields_values = buildCustomFieldsPayload(ctx.input.customFieldsValues);
    }

    let embedded: Record<string, any> = {};
    if (ctx.input.tags?.length) {
      embedded.tags = buildTagsPayload(ctx.input.tags);
    }
    if (ctx.input.contactId) {
      embedded.contacts = [{ id: ctx.input.contactId, is_main: true }];
    }
    if (ctx.input.companyId) {
      embedded.companies = [{ id: ctx.input.companyId }];
    }
    if (Object.keys(embedded).length > 0) {
      payload._embedded = embedded;
    }

    let result = await client.createLead(payload);

    return {
      output: { leadId: result.id },
      message: `Created lead **${ctx.input.name}** with ID **${result.id}**.`
    };
  })
  .build();
