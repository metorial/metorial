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

export let createContactTool = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact in Kommo. Set the contact name, assign a responsible user, add tags, set custom field values (e.g., phone, email), and optionally link to a company.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().optional().describe('Contact full name'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      responsibleUserId: z.number().optional().describe('ID of the responsible user'),
      tags: z.array(tagSchema).optional().describe('Tags to attach'),
      customFieldsValues: z
        .array(customFieldValueSchema)
        .optional()
        .describe('Custom field values (use for phone, email, etc.)'),
      companyId: z.number().optional().describe('ID of a company to link this contact to')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('ID of the created contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KommoClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let payload: Record<string, any> = {};

    if (ctx.input.name) payload.name = ctx.input.name;
    if (ctx.input.firstName) payload.first_name = ctx.input.firstName;
    if (ctx.input.lastName) payload.last_name = ctx.input.lastName;
    if (ctx.input.responsibleUserId) payload.responsible_user_id = ctx.input.responsibleUserId;

    if (ctx.input.customFieldsValues?.length) {
      payload.custom_fields_values = buildCustomFieldsPayload(ctx.input.customFieldsValues);
    }

    let embedded: Record<string, any> = {};
    if (ctx.input.tags?.length) {
      embedded.tags = buildTagsPayload(ctx.input.tags);
    }
    if (ctx.input.companyId) {
      embedded.companies = [{ id: ctx.input.companyId }];
    }
    if (Object.keys(embedded).length > 0) {
      payload._embedded = embedded;
    }

    let result = await client.createContact(payload);

    return {
      output: { contactId: result.id },
      message: `Created contact${ctx.input.name ? ` **${ctx.input.name}**` : ''} with ID **${result.id}**.`
    };
  })
  .build();
