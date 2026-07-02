import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { MailchimpClient } from '../lib/client';
import { mailchimpServiceError } from '../lib/errors';
import { spec } from '../spec';

let mergeFieldOptionsSchema = z
  .object({
    defaultCountry: z.number().optional().describe('Default country code for address fields'),
    phoneFormat: z
      .string()
      .optional()
      .describe('Phone field format, for example "US" or "none"'),
    dateFormat: z
      .string()
      .optional()
      .describe('Date format for date fields, for example "MM/DD/YYYY"'),
    choices: z
      .array(z.string())
      .optional()
      .describe('Allowed values for radio or dropdown fields'),
    size: z.number().optional().describe('Display size for text fields')
  })
  .optional();

let mergeFieldSchema = z.object({
  mergeId: z.number(),
  tag: z.string(),
  name: z.string(),
  type: z.string(),
  required: z.boolean(),
  public: z.boolean(),
  displayOrder: z.number().optional(),
  defaultValue: z.string().optional(),
  helpText: z.string().optional(),
  listId: z.string().optional()
});

let mapMergeField = (field: any) => ({
  mergeId: field.merge_id,
  tag: field.tag,
  name: field.name,
  type: field.type,
  required: field.required ?? false,
  public: field.public ?? true,
  displayOrder: field.display_order,
  defaultValue: field.default_value || undefined,
  helpText: field.help_text || undefined,
  listId: field.list_id
});

let buildMergeFieldBody = (input: {
  name?: string;
  type?: string;
  tag?: string;
  required?: boolean;
  defaultValue?: string;
  public?: boolean;
  displayOrder?: number;
  helpText?: string;
  options?: {
    defaultCountry?: number;
    phoneFormat?: string;
    dateFormat?: string;
    choices?: string[];
    size?: number;
  };
}) => {
  let body: Record<string, any> = {};

  if (input.name) body.name = input.name;
  if (input.type) body.type = input.type;
  if (input.tag) body.tag = input.tag;
  if (input.required !== undefined) body.required = input.required;
  if (input.defaultValue !== undefined) body.default_value = input.defaultValue;
  if (input.public !== undefined) body.public = input.public;
  if (input.displayOrder !== undefined) body.display_order = input.displayOrder;
  if (input.helpText !== undefined) body.help_text = input.helpText;
  if (input.options) {
    body.options = {};
    if (input.options.defaultCountry !== undefined) {
      body.options.default_country = input.options.defaultCountry;
    }
    if (input.options.phoneFormat) body.options.phone_format = input.options.phoneFormat;
    if (input.options.dateFormat) body.options.date_format = input.options.dateFormat;
    if (input.options.choices) body.options.choices = input.options.choices;
    if (input.options.size !== undefined) body.options.size = input.options.size;
  }

  return body;
};

export let manageMergeFieldsTool = SlateTool.create(spec, {
  name: 'Manage Merge Fields',
  key: 'manage_merge_fields',
  description:
    'List, get, create, update, or delete audience merge fields. Merge fields store custom contact data used for personalization, segmentation, and signup forms.',
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('Audience ID'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .optional()
        .describe('Action to perform. Defaults to "list".'),
      mergeId: z.number().optional().describe('Merge field ID for get/update/delete'),
      name: z.string().optional().describe('Display name of the merge field'),
      type: z
        .enum([
          'text',
          'number',
          'address',
          'phone',
          'date',
          'url',
          'imageurl',
          'radio',
          'dropdown',
          'birthday',
          'zip'
        ])
        .optional()
        .describe('Merge field type. Required when creating.'),
      tag: z
        .string()
        .optional()
        .describe('Merge tag, such as "COMPANY". Mailchimp can generate one if omitted.'),
      required: z.boolean().optional().describe('Whether contacts must provide this field'),
      defaultValue: z.string().optional().describe('Default value for the field'),
      public: z.boolean().optional().describe('Whether the field appears on signup forms'),
      displayOrder: z.number().optional().describe('Display order on signup forms'),
      helpText: z.string().optional().describe('Help text shown for the field'),
      options: mergeFieldOptionsSchema.describe('Type-specific field options'),
      count: z.number().optional().describe('Number of merge fields to return when listing'),
      offset: z.number().optional().describe('Number of merge fields to skip when listing')
    })
  )
  .output(
    z.object({
      mergeFields: z.array(mergeFieldSchema).optional(),
      mergeField: mergeFieldSchema.optional(),
      deleted: z.boolean().optional(),
      totalItems: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailchimpClient({
      token: ctx.auth.token,
      serverPrefix: ctx.auth.serverPrefix
    });

    let action = ctx.input.action ?? 'list';

    if (action === 'list') {
      let result = await client.getMergeFields(ctx.input.listId, {
        count: ctx.input.count,
        offset: ctx.input.offset
      });
      let mergeFields = (result.merge_fields ?? []).map(mapMergeField);

      return {
        output: {
          mergeFields,
          totalItems: result.total_items ?? 0
        },
        message: `Found **${mergeFields.length}** merge field(s) in audience ${ctx.input.listId}.`
      };
    }

    if (action === 'get') {
      if (ctx.input.mergeId === undefined) {
        throw mailchimpServiceError('mergeId is required to get a merge field.');
      }

      let result = await client.getMergeField(ctx.input.listId, ctx.input.mergeId);
      let mergeField = mapMergeField(result);

      return {
        output: { mergeField },
        message: `Retrieved merge field **${mergeField.name}** (${mergeField.tag}).`
      };
    }

    if (action === 'delete') {
      if (ctx.input.mergeId === undefined) {
        throw mailchimpServiceError('mergeId is required to delete a merge field.');
      }

      await client.deleteMergeField(ctx.input.listId, ctx.input.mergeId);

      return {
        output: { deleted: true },
        message: `Merge field **${ctx.input.mergeId}** has been deleted.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name || !ctx.input.type) {
        throw mailchimpServiceError('name and type are required to create a merge field.');
      }

      let result = await client.createMergeField(
        ctx.input.listId,
        buildMergeFieldBody(ctx.input)
      );
      let mergeField = mapMergeField(result);

      return {
        output: { mergeField },
        message: `Merge field **${mergeField.name}** (${mergeField.tag}) has been created.`
      };
    }

    if (ctx.input.mergeId === undefined) {
      throw mailchimpServiceError('mergeId is required to update a merge field.');
    }

    let updateBody = buildMergeFieldBody(ctx.input);
    if (Object.keys(updateBody).length === 0) {
      throw mailchimpServiceError(
        'At least one field must be provided to update a merge field.'
      );
    }

    let result = await client.updateMergeField(
      ctx.input.listId,
      ctx.input.mergeId,
      updateBody
    );
    let mergeField = mapMergeField(result);

    return {
      output: { mergeField },
      message: `Merge field **${mergeField.name}** (${mergeField.tag}) has been updated.`
    };
  })
  .build();
