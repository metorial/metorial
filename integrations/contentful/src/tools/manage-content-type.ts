import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let fieldSchema = z.object({
  fieldId: z.string().describe('Unique field ID (used in API).'),
  name: z.string().describe('Display name for the field.'),
  type: z
    .enum([
      'Symbol',
      'Text',
      'Integer',
      'Number',
      'Date',
      'Boolean',
      'Object',
      'Location',
      'RichText',
      'Link',
      'Array'
    ])
    .describe('Field type.'),
  required: z.boolean().optional().describe('Whether the field is required.'),
  localized: z.boolean().optional().describe('Whether the field supports localization.'),
  linkType: z.string().optional().describe('For Link fields: "Entry" or "Asset".'),
  items: z
    .object({
      type: z.string().optional(),
      linkType: z.string().optional(),
      validations: z.array(z.any()).optional()
    })
    .optional()
    .describe('For Array fields: item definition.'),
  validations: z.array(z.any()).optional().describe('Field validations.')
});

export let manageContentType = SlateTool.create(spec, {
  name: 'Manage Content Type',
  key: 'manage_content_type',
  description: `Create, update, publish, unpublish, or delete a content type. When creating or updating, provide the full field definitions. Use the activate action to publish a content type so entries can be created from it.`,
  instructions: [
    'Field IDs should be camelCase identifiers.',
    'A content type must be activated (published) before entries can be created from it.',
    'To update, provide the contentTypeId and the complete updated fields array.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'activate', 'deactivate', 'delete'])
        .describe('Action to perform on the content type.'),
      contentTypeId: z
        .string()
        .optional()
        .describe('Content type ID. Required for update, activate, deactivate, and delete.'),
      name: z.string().optional().describe('Display name. Required for create and update.'),
      description: z.string().optional().describe('Content type description.'),
      displayField: z
        .string()
        .optional()
        .describe('ID of the field to use as the display/title field.'),
      fields: z
        .array(fieldSchema)
        .optional()
        .describe('Field definitions. Required for create and update.'),
      version: z
        .number()
        .optional()
        .describe('Current version. Fetched automatically if omitted.')
    })
  )
  .output(
    z.object({
      contentTypeId: z.string().describe('Content type ID.'),
      action: z.string().describe('Action performed.'),
      version: z.number().optional().describe('Version after the action.'),
      name: z.string().optional().describe('Content type name.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let { action, contentTypeId } = ctx.input;

    let mapFields = (fields: any[]) =>
      fields.map(f => ({
        id: f.fieldId,
        name: f.name,
        type: f.type,
        required: f.required,
        localized: f.localized,
        linkType: f.linkType,
        items: f.items,
        validations: f.validations
      }));

    let result: any;

    switch (action) {
      case 'create': {
        if (!ctx.input.name || !ctx.input.fields) {
          throw new Error('name and fields are required for creating a content type');
        }
        result = await client.createContentType({
          name: ctx.input.name,
          description: ctx.input.description,
          displayField: ctx.input.displayField,
          fields: mapFields(ctx.input.fields)
        });
        contentTypeId = result.sys.id;
        break;
      }
      case 'update': {
        if (!contentTypeId || !ctx.input.name || !ctx.input.fields) {
          throw new Error(
            'contentTypeId, name, and fields are required for updating a content type'
          );
        }
        let version = ctx.input.version;
        if (!version) {
          let current = await client.getContentType(contentTypeId);
          version = current.sys.version;
        }
        result = await client.updateContentType(
          contentTypeId,
          {
            name: ctx.input.name,
            description: ctx.input.description,
            displayField: ctx.input.displayField,
            fields: mapFields(ctx.input.fields)
          },
          version!
        );
        break;
      }
      case 'activate': {
        if (!contentTypeId) throw new Error('contentTypeId is required');
        let version = ctx.input.version;
        if (!version) {
          let current = await client.getContentType(contentTypeId);
          version = current.sys.version;
        }
        result = await client.publishContentType(contentTypeId, version!);
        break;
      }
      case 'deactivate': {
        if (!contentTypeId) throw new Error('contentTypeId is required');
        let version = ctx.input.version;
        if (!version) {
          let current = await client.getContentType(contentTypeId);
          version = current.sys.version;
        }
        result = await client.unpublishContentType(contentTypeId, version!);
        break;
      }
      case 'delete': {
        if (!contentTypeId) throw new Error('contentTypeId is required');
        await client.deleteContentType(contentTypeId);
        break;
      }
    }

    return {
      output: {
        contentTypeId: contentTypeId || result?.sys?.id || '',
        action,
        version: result?.sys?.version,
        name: result?.name || ctx.input.name
      },
      message:
        action === 'delete'
          ? `Deleted content type **${contentTypeId}**.`
          : `Content type **${contentTypeId || result?.sys?.id}** has been **${action}d** (version ${result?.sys?.version}).`
    };
  })
  .build();
