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

export let updateCompanyTool = SlateTool.create(spec, {
  name: 'Update Company',
  key: 'update_company',
  description: `Update an existing company. Change name, responsible user, tags, or custom field values.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      companyId: z.number().describe('ID of the company to update'),
      name: z.string().optional().describe('New company name'),
      responsibleUserId: z.number().optional().describe('New responsible user ID'),
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
      companyId: z.number().describe('ID of the updated company'),
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
    if (ctx.input.responsibleUserId !== undefined)
      payload.responsible_user_id = ctx.input.responsibleUserId;

    if (ctx.input.customFieldsValues?.length) {
      payload.custom_fields_values = buildCustomFieldsPayload(ctx.input.customFieldsValues);
    }
    if (ctx.input.tagsToAdd?.length) {
      payload.tags_to_add = buildTagsPayload(ctx.input.tagsToAdd);
    }
    if (ctx.input.tagsToDelete?.length) {
      payload.tags_to_delete = buildTagsPayload(ctx.input.tagsToDelete);
    }

    let result = await client.updateCompany(ctx.input.companyId, payload);

    return {
      output: { companyId: result.id, updatedAt: result.updated_at },
      message: `Updated company **${ctx.input.companyId}**.`
    };
  })
  .build();
