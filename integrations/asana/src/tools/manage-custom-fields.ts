import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { asanaServiceError } from '../lib/errors';
import { spec } from '../spec';

let enumOptionInputSchema = z.object({
  name: z.string(),
  color: z.string().optional(),
  enabled: z.boolean().optional()
});

let customFieldSchema = z.object({
  customFieldId: z.string(),
  name: z.string().optional(),
  type: z.string().optional(),
  resourceSubtype: z.string().optional(),
  description: z.string().nullable().optional(),
  enumOptions: z.array(z.any()).optional(),
  precision: z.number().nullable().optional(),
  format: z.string().nullable().optional(),
  currencyCode: z.string().nullable().optional(),
  hasNotificationsEnabled: z.boolean().optional()
});

let formatCustomField = (field: any) => ({
  customFieldId: field.gid,
  name: field.name,
  type: field.type,
  resourceSubtype: field.resource_subtype,
  description: field.description,
  enumOptions: field.enum_options,
  precision: field.precision,
  format: field.format,
  currencyCode: field.currency_code,
  hasNotificationsEnabled: field.has_notifications_enabled
});

let requireField = <T>(value: T | undefined | null, label: string, action: string): T => {
  if (value === undefined || value === null || value === '') {
    throw asanaServiceError(`${label} is required for "${action}".`);
  }

  return value;
};

let buildCustomFieldData = (input: {
  name?: string;
  fieldType?: string;
  description?: string | null;
  enumOptions?: z.infer<typeof enumOptionInputSchema>[];
  precision?: number;
  format?: string;
  currencyCode?: string;
  hasNotificationsEnabled?: boolean;
}) => {
  let data: Record<string, any> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.fieldType !== undefined) data.resource_subtype = input.fieldType;
  if (input.description !== undefined) data.description = input.description;
  if (input.enumOptions !== undefined) data.enum_options = input.enumOptions;
  if (input.precision !== undefined) data.precision = input.precision;
  if (input.format !== undefined) data.format = input.format;
  if (input.currencyCode !== undefined) data.currency_code = input.currencyCode;
  if (input.hasNotificationsEnabled !== undefined) {
    data.has_notifications_enabled = input.hasNotificationsEnabled;
  }
  return data;
};

export let manageCustomFields = SlateTool.create(spec, {
  name: 'Manage Custom Fields',
  key: 'manage_custom_fields',
  description: `List, inspect, create, update, and maintain Asana custom field metadata for a workspace.`,
  instructions: [
    'Use action "list" with workspaceId to discover custom field GIDs.',
    'Use action "get" with customFieldId before setting task customFields values.',
    'Use action "create" with workspaceId, name, and fieldType.',
    'Use action "create_enum_option" with customFieldId and enumOptionName for enum or multi_enum fields.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'create_enum_option', 'update_enum_option'])
        .describe('Custom field metadata operation to perform.'),
      workspaceId: z.string().optional().describe('Workspace GID for list/create actions.'),
      customFieldId: z
        .string()
        .optional()
        .describe('Custom field GID for get/update/enum option actions.'),
      enumOptionId: z.string().optional().describe('Enum option GID for update_enum_option.'),
      name: z.string().optional().describe('Custom field name for create/update.'),
      fieldType: z
        .enum(['text', 'enum', 'multi_enum', 'number', 'date', 'people'])
        .optional()
        .describe('Custom field resource subtype for create.'),
      description: z
        .string()
        .nullable()
        .optional()
        .describe('Custom field description, or null to clear when supported.'),
      enumOptions: z
        .array(enumOptionInputSchema)
        .optional()
        .describe('Enum options for enum or multi_enum field creation.'),
      enumOptionName: z
        .string()
        .optional()
        .describe('Enum option name for create/update enum option actions.'),
      enumOptionColor: z
        .string()
        .optional()
        .describe('Enum option color for create/update enum option actions.'),
      enumOptionEnabled: z
        .boolean()
        .optional()
        .describe('Enable or disable an enum option on update.'),
      precision: z.number().optional().describe('Decimal precision for number fields.'),
      format: z.string().optional().describe('Number field format.'),
      currencyCode: z.string().optional().describe('Currency code for currency fields.'),
      hasNotificationsEnabled: z
        .boolean()
        .optional()
        .describe('Whether notifications are enabled for custom field changes.'),
      limit: z.number().optional().describe('Maximum custom fields to return for list action.')
    })
  )
  .output(
    z.object({
      customFields: z.array(customFieldSchema).optional(),
      customField: customFieldSchema.optional(),
      enumOption: z.any().optional(),
      customFieldCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let workspaceId = requireField(ctx.input.workspaceId, 'workspaceId', ctx.input.action);
      let result = await client.listCustomFieldsInWorkspace(workspaceId, {
        limit: ctx.input.limit
      });
      let customFields = (result.data || []).map(formatCustomField);

      return {
        output: { customFields, customFieldCount: customFields.length },
        message: `Found **${customFields.length}** custom field(s).`
      };
    }

    if (ctx.input.action === 'get') {
      let customFieldId = requireField(
        ctx.input.customFieldId,
        'customFieldId',
        ctx.input.action
      );
      let customField = formatCustomField(await client.getCustomField(customFieldId));

      return {
        output: { customField, customFieldCount: 1 },
        message: `Retrieved custom field **${customField.name ?? customField.customFieldId}**.`
      };
    }

    if (ctx.input.action === 'create') {
      let workspaceId = requireField(ctx.input.workspaceId, 'workspaceId', ctx.input.action);
      requireField(ctx.input.name, 'name', ctx.input.action);
      requireField(ctx.input.fieldType, 'fieldType', ctx.input.action);

      let customField = formatCustomField(
        await client.createCustomField(workspaceId, buildCustomFieldData(ctx.input))
      );

      return {
        output: { customField, customFieldCount: 1 },
        message: `Created custom field **${customField.name ?? customField.customFieldId}**.`
      };
    }

    if (ctx.input.action === 'update') {
      let customFieldId = requireField(
        ctx.input.customFieldId,
        'customFieldId',
        ctx.input.action
      );
      let {
        resource_subtype: _resourceSubtype,
        enum_options: _enumOptions,
        ...data
      } = buildCustomFieldData(ctx.input);

      if (Object.keys(data).length === 0) {
        throw asanaServiceError('Provide at least one custom field property to update.');
      }

      let customField = formatCustomField(await client.updateCustomField(customFieldId, data));

      return {
        output: { customField, customFieldCount: 1 },
        message: `Updated custom field **${customField.name ?? customField.customFieldId}**.`
      };
    }

    if (ctx.input.action === 'create_enum_option') {
      let customFieldId = requireField(
        ctx.input.customFieldId,
        'customFieldId',
        ctx.input.action
      );
      let name = requireField(ctx.input.enumOptionName, 'enumOptionName', ctx.input.action);
      let enumOption = await client.createEnumOption(customFieldId, {
        name,
        color: ctx.input.enumOptionColor
      });

      return {
        output: { enumOption },
        message: `Created enum option **${enumOption.name ?? name}**.`
      };
    }

    let enumOptionId = requireField(ctx.input.enumOptionId, 'enumOptionId', ctx.input.action);
    let enumData: Record<string, any> = {};
    if (ctx.input.enumOptionName !== undefined) enumData.name = ctx.input.enumOptionName;
    if (ctx.input.enumOptionColor !== undefined) enumData.color = ctx.input.enumOptionColor;
    if (ctx.input.enumOptionEnabled !== undefined) {
      enumData.enabled = ctx.input.enumOptionEnabled;
    }
    if (Object.keys(enumData).length === 0) {
      throw asanaServiceError('Provide at least one enum option property to update.');
    }

    let enumOption = await client.updateEnumOption(enumOptionId, enumData);

    return {
      output: { enumOption },
      message: `Updated enum option **${enumOption.name ?? enumOptionId}**.`
    };
  })
  .build();
