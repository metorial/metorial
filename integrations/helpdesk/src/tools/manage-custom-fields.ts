import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let customFieldSchema = z.object({
  id: z.string().describe('Unique custom field identifier'),
  name: z.string().describe('Custom field name'),
  type: z
    .enum(['single_line', 'multi_line', 'url', 'date'])
    .describe('Custom field data type'),
  editPermission: z
    .enum(['normal', 'owner', 'read_only'])
    .optional()
    .describe(
      'Who can edit this field: "normal" (all agents), "owner" (field owner only), or "read_only" (no one)'
    ),
  teamIDs: z
    .array(z.string())
    .optional()
    .describe('IDs of teams this custom field is available to'),
  active: z.boolean().optional().describe('Whether the custom field is currently active'),
  createdAt: z
    .string()
    .optional()
    .describe('ISO 8601 timestamp when the custom field was created'),
  updatedAt: z
    .string()
    .optional()
    .describe('ISO 8601 timestamp when the custom field was last updated')
});

export let manageCustomFields = SlateTool.create(spec, {
  name: 'Manage Custom Fields',
  key: 'manage_custom_fields',
  description: `List, get, create, update, and delete HelpDesk custom fields. Custom fields allow you to add additional structured data to tickets beyond the default fields. They support different data types (single line text, multi-line text, URL, date) and can be scoped to specific teams with configurable edit permissions.`,
  instructions: [
    'Use "list" to retrieve all custom fields in the account.',
    'Use "get" with a customFieldId to retrieve a specific custom field.',
    'Use "create" with name and type to create a new custom field.',
    'Use "update" with a customFieldId plus fields to modify an existing custom field.',
    'Use "delete" with a customFieldId to remove a custom field.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform on custom fields'),
      customFieldId: z
        .string()
        .optional()
        .describe('Custom field ID (required for get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe('Custom field name (required for create, optional for update)'),
      type: z
        .enum(['single_line', 'multi_line', 'url', 'date'])
        .optional()
        .describe(
          'Custom field data type (required for create): "single_line", "multi_line", "url", or "date"'
        ),
      editPermission: z
        .enum(['normal', 'owner', 'read_only'])
        .optional()
        .describe(
          'Edit permission level: "normal" (all agents), "owner" (field owner only), or "read_only" (no editing)'
        ),
      teamIDs: z
        .array(z.string())
        .optional()
        .describe('Team IDs to scope this custom field to (optional for create and update)'),
      active: z
        .boolean()
        .optional()
        .describe('Whether the custom field should be active (optional for create and update)')
    })
  )
  .output(
    z.object({
      customFields: z
        .array(customFieldSchema)
        .optional()
        .describe('List of custom fields (for list action)'),
      customField: customFieldSchema
        .optional()
        .describe('Single custom field details (for get, create, update actions)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the custom field was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'list') {
      let customFields = await client.listCustomFields();
      return {
        output: { customFields },
        message: `Found **${customFields.length}** custom field(s).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.customFieldId) {
        throw new Error('customFieldId is required for the "get" action');
      }
      let customField = await client.getCustomField(ctx.input.customFieldId);
      return {
        output: { customField },
        message: `Retrieved custom field **${customField.name}** (${customField.id}, type: ${customField.type}).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) {
        throw new Error('name is required for the "create" action');
      }
      if (!ctx.input.type) {
        throw new Error('type is required for the "create" action');
      }
      let input: Record<string, unknown> = {
        name: ctx.input.name,
        type: ctx.input.type
      };
      if (ctx.input.editPermission !== undefined)
        input.editPermission = ctx.input.editPermission;
      if (ctx.input.teamIDs !== undefined) input.teamIDs = ctx.input.teamIDs;
      if (ctx.input.active !== undefined) input.active = ctx.input.active;

      let customField = await client.createCustomField(input as any);
      return {
        output: { customField },
        message: `Created custom field **${customField.name}** (${customField.id}, type: ${customField.type}).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.customFieldId) {
        throw new Error('customFieldId is required for the "update" action');
      }
      let input: Record<string, unknown> = {};
      if (ctx.input.name !== undefined) input.name = ctx.input.name;
      if (ctx.input.editPermission !== undefined)
        input.editPermission = ctx.input.editPermission;
      if (ctx.input.teamIDs !== undefined) input.teamIDs = ctx.input.teamIDs;
      if (ctx.input.active !== undefined) input.active = ctx.input.active;

      let customField = await client.updateCustomField(ctx.input.customFieldId, input as any);
      return {
        output: { customField },
        message: `Updated custom field **${customField.name}** (${customField.id}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.customFieldId) {
        throw new Error('customFieldId is required for the "delete" action');
      }
      await client.deleteCustomField(ctx.input.customFieldId);
      return {
        output: { deleted: true },
        message: `Deleted custom field **${ctx.input.customFieldId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
