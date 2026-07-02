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

export let updateContactTool = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact. Change name, responsible user, tags, or custom field values (phone, email, etc.).`,
  tags: { destructive: false }
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact to update'),
      name: z.string().optional().describe('New contact name'),
      firstName: z.string().optional().describe('New first name'),
      lastName: z.string().optional().describe('New last name'),
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
      contactId: z.number().describe('ID of the updated contact'),
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
    if (ctx.input.firstName !== undefined) payload.first_name = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) payload.last_name = ctx.input.lastName;
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

    let result = await client.updateContact(ctx.input.contactId, payload);

    return {
      output: { contactId: result.id, updatedAt: result.updated_at },
      message: `Updated contact **${ctx.input.contactId}**.`
    };
  })
  .build();
