import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { intercomServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageDataAttributes = SlateTool.create(spec, {
  name: 'Manage Data Attributes',
  key: 'manage_data_attributes',
  description: `List, create, update, or archive Intercom custom data attributes for contacts and companies. Data attributes define metadata fields used by contacts, companies, and conversations.`,
  instructions: [
    'Use "list" to inspect available attributes before writing custom attributes.',
    'Use "create" for contact or company custom attributes.',
    'Use "update" with archived=true to archive a custom data attribute.',
    'For dataType "options", provide at least two option values.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update']).describe('Operation to perform'),
      attributeId: z.string().optional().describe('Data attribute ID (required for update)'),
      model: z
        .enum(['contact', 'company', 'conversation'])
        .optional()
        .describe('Attribute model to list or create'),
      name: z.string().optional().describe('Data attribute name (required for create)'),
      dataType: z
        .enum(['string', 'integer', 'float', 'boolean', 'date', 'options'])
        .optional()
        .describe('Data type (required for create)'),
      description: z.string().optional().describe('Readable description'),
      options: z.array(z.string()).optional().describe('Option values for dataType "options"'),
      includeArchived: z
        .boolean()
        .optional()
        .describe('Include archived data attributes in list results'),
      archived: z.boolean().optional().describe('Archive or unarchive a custom attribute'),
      messengerWritable: z
        .boolean()
        .optional()
        .describe('Whether the Messenger can update this custom attribute')
    })
  )
  .output(
    z.object({
      attribute: z
        .object({
          attributeId: z.string().optional().describe('Data attribute ID'),
          model: z.string().optional().describe('Attribute model'),
          name: z.string().optional().describe('Attribute name'),
          fullName: z.string().optional().describe('Full attribute path'),
          label: z.string().optional().describe('Readable label'),
          description: z.string().optional().describe('Readable description'),
          dataType: z.string().optional().describe('Data type'),
          options: z.array(z.string()).optional().describe('Option values'),
          apiWritable: z.boolean().optional().describe('Whether API writable'),
          messengerWritable: z.boolean().optional().describe('Whether Messenger writable'),
          uiWritable: z.boolean().optional().describe('Whether UI writable'),
          custom: z.boolean().optional().describe('Whether this is custom'),
          archived: z.boolean().optional().describe('Whether archived'),
          createdAt: z.string().optional().describe('Creation timestamp'),
          updatedAt: z.string().optional().describe('Last update timestamp')
        })
        .optional()
        .describe('Created or updated data attribute'),
      attributes: z
        .array(
          z.object({
            attributeId: z.string().optional().describe('Data attribute ID'),
            model: z.string().optional().describe('Attribute model'),
            name: z.string().optional().describe('Attribute name'),
            fullName: z.string().optional().describe('Full attribute path'),
            label: z.string().optional().describe('Readable label'),
            description: z.string().optional().describe('Readable description'),
            dataType: z.string().optional().describe('Data type'),
            options: z.array(z.string()).optional().describe('Option values'),
            apiWritable: z.boolean().optional().describe('Whether API writable'),
            messengerWritable: z.boolean().optional().describe('Whether Messenger writable'),
            uiWritable: z.boolean().optional().describe('Whether UI writable'),
            custom: z.boolean().optional().describe('Whether this is custom'),
            archived: z.boolean().optional().describe('Whether archived'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .optional()
        .describe('Data attributes returned for list action')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    if (ctx.input.action === 'list') {
      let result = await client.listDataAttributes({
        model: ctx.input.model,
        includeArchived: ctx.input.includeArchived
      });
      let attributes = (result.data || []).map(mapDataAttribute);

      return {
        output: { attributes },
        message: `Found **${attributes.length}** data attributes`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name || !ctx.input.model || !ctx.input.dataType) {
        throw intercomServiceError('name, model, and dataType are required for create');
      }
      if (ctx.input.model === 'conversation') {
        throw intercomServiceError('Only contact and company attributes can be created');
      }
      if (ctx.input.dataType === 'options' && (ctx.input.options?.length ?? 0) < 2) {
        throw intercomServiceError(
          'At least two options are required when dataType is "options"'
        );
      }

      let result = await client.createDataAttribute({
        name: ctx.input.name,
        model: ctx.input.model,
        dataType: ctx.input.dataType,
        description: ctx.input.description,
        options: ctx.input.options,
        messengerWritable: ctx.input.messengerWritable
      });
      let attribute = mapDataAttribute(result);

      return {
        output: { attribute },
        message: `Created data attribute **${attribute.name || attribute.attributeId}**`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.attributeId) {
        throw intercomServiceError('attributeId is required for update');
      }
      if (ctx.input.options && ctx.input.options.length < 2) {
        throw intercomServiceError('At least two options are required when updating options');
      }

      let result = await client.updateDataAttribute(ctx.input.attributeId, {
        description: ctx.input.description,
        options: ctx.input.options,
        archived: ctx.input.archived,
        messengerWritable: ctx.input.messengerWritable
      });
      let attribute = mapDataAttribute(result);

      return {
        output: { attribute },
        message: `Updated data attribute **${attribute.name || attribute.attributeId}**`
      };
    }

    throw intercomServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();

let mapDataAttribute = (data: any) => ({
  attributeId: data.id !== undefined && data.id !== null ? String(data.id) : undefined,
  model: data.model,
  name: data.name,
  fullName: data.full_name,
  label: data.label,
  description: data.description,
  dataType: data.data_type,
  options: (data.options || [])
    .map((option: any) => (typeof option === 'string' ? option : option?.value))
    .filter((option: unknown): option is string => typeof option === 'string'),
  apiWritable: data.api_writable,
  messengerWritable: data.messenger_writable,
  uiWritable: data.ui_writable,
  custom: data.custom,
  archived: data.archived,
  createdAt: data.created_at ? String(data.created_at) : undefined,
  updatedAt: data.updated_at ? String(data.updated_at) : undefined
});
