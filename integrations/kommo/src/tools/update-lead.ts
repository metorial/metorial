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

export let updateLeadTool = SlateTool.create(spec, {
  name: 'Update Lead',
  key: 'update_lead',
  description: `Update an existing lead. Change its name, price, pipeline stage, responsible user, tags, custom fields, or loss reason. Use this to move leads between pipeline stages or mark them as won/lost.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      leadId: z.number().describe('ID of the lead to update'),
      name: z.string().optional().describe('New lead name'),
      price: z.number().optional().describe('New deal value/price'),
      statusId: z.number().optional().describe('New pipeline stage/status ID'),
      pipelineId: z.number().optional().describe('New pipeline ID'),
      responsibleUserId: z.number().optional().describe('New responsible user ID'),
      lossReasonId: z.number().optional().describe('Loss reason ID (for closed-lost leads)'),
      tagsToAdd: z.array(tagSchema).optional().describe('Tags to add'),
      tagsToDelete: z.array(tagSchema).optional().describe('Tags to remove'),
      customFieldsValues: z
        .array(customFieldValueSchema)
        .optional()
        .describe('Custom field values to update')
    })
  )
  .output(
    z.object({
      leadId: z.number().describe('ID of the updated lead'),
      updatedAt: z.number().optional().describe('Updated timestamp (Unix)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KommoClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let payload: Record<string, any> = {};

    if (ctx.input.name !== undefined) payload.name = ctx.input.name;
    if (ctx.input.price !== undefined) payload.price = ctx.input.price;
    if (ctx.input.statusId !== undefined) payload.status_id = ctx.input.statusId;
    if (ctx.input.pipelineId !== undefined) payload.pipeline_id = ctx.input.pipelineId;
    if (ctx.input.responsibleUserId !== undefined)
      payload.responsible_user_id = ctx.input.responsibleUserId;
    if (ctx.input.lossReasonId !== undefined) payload.loss_reason_id = ctx.input.lossReasonId;

    if (ctx.input.customFieldsValues?.length) {
      payload.custom_fields_values = buildCustomFieldsPayload(ctx.input.customFieldsValues);
    }
    if (ctx.input.tagsToAdd?.length) {
      payload.tags_to_add = buildTagsPayload(ctx.input.tagsToAdd);
    }
    if (ctx.input.tagsToDelete?.length) {
      payload.tags_to_delete = buildTagsPayload(ctx.input.tagsToDelete);
    }

    let result = await client.updateLead(ctx.input.leadId, payload);

    return {
      output: { leadId: result.id, updatedAt: result.updated_at },
      message: `Updated lead **${ctx.input.leadId}**.`
    };
  })
  .build();
