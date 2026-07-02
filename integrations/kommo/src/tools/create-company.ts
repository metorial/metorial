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

export let createCompanyTool = SlateTool.create(spec, {
  name: 'Create Company',
  key: 'create_company',
  description: `Create a new company in Kommo. Set the company name, assign a responsible user, add tags, and set custom field values.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Company name'),
      responsibleUserId: z.number().optional().describe('ID of the responsible user'),
      tags: z.array(tagSchema).optional().describe('Tags to attach'),
      customFieldsValues: z
        .array(customFieldValueSchema)
        .optional()
        .describe('Custom field values')
    })
  )
  .output(
    z.object({
      companyId: z.number().describe('ID of the created company')
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

    if (ctx.input.responsibleUserId) payload.responsible_user_id = ctx.input.responsibleUserId;

    if (ctx.input.customFieldsValues?.length) {
      payload.custom_fields_values = buildCustomFieldsPayload(ctx.input.customFieldsValues);
    }

    if (ctx.input.tags?.length) {
      payload._embedded = { tags: buildTagsPayload(ctx.input.tags) };
    }

    let result = await client.createCompany(payload);

    return {
      output: { companyId: result.id },
      message: `Created company **${ctx.input.name}** with ID **${result.id}**.`
    };
  })
  .build();
