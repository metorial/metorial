import { SlateTool } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { gumroadServiceError } from '../lib/errors';
import { spec } from '../spec';

let customFieldSchema = z.object({
  name: z.string().describe('Custom field name'),
  required: z.boolean().optional().describe('Whether the field is required at checkout'),
  type: z.string().optional().describe('Field type')
});

export let manageCustomFields = SlateTool.create(spec, {
  name: 'Manage Custom Fields',
  key: 'manage_custom_fields',
  description: `List, create, update, or delete custom fields on a Gumroad product. Custom fields collect additional buyer information at checkout (e.g., shipping address, size preference).`,
  instructions: [
    'Custom fields are identified by name, not by a separate ID.',
    'When updating or deleting, use the field name as the identifier.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      productId: z.string().describe('The product ID'),
      name: z
        .string()
        .optional()
        .describe('Custom field name (required for create, update, delete)'),
      required: z.boolean().optional().describe('Whether the field is required at checkout')
    })
  )
  .output(
    z.object({
      customField: customFieldSchema
        .optional()
        .describe('Single custom field (for create, update)'),
      customFields: z
        .array(customFieldSchema)
        .optional()
        .describe('List of custom fields (for list)'),
      deleted: z.boolean().optional().describe('Whether the field was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GumroadClient({ token: ctx.auth.token });
    let { action, productId, name } = ctx.input;

    if (action === 'list') {
      let fields = await client.listCustomFields(productId);
      let mapped = fields.map((f: any) => ({
        name: f.name || '',
        required: f.required,
        type: f.type || undefined
      }));
      return {
        output: { customFields: mapped },
        message: `Found **${mapped.length}** custom field(s).`
      };
    }

    if (action === 'create') {
      if (!name) throw gumroadServiceError('name is required for create action.');
      let field = await client.createCustomField(productId, {
        name,
        required: ctx.input.required
      });
      return {
        output: {
          customField: {
            name: field.name || name,
            required: field.required,
            type: field.type || undefined
          }
        },
        message: `Created custom field **${name}**.`
      };
    }

    if (action === 'update') {
      if (!name) throw gumroadServiceError('name is required for update action.');
      let field = await client.updateCustomField(productId, name, {
        required: ctx.input.required
      });
      return {
        output: {
          customField: {
            name: field.name || name,
            required: field.required,
            type: field.type || undefined
          }
        },
        message: `Updated custom field **${name}**.`
      };
    }

    if (action === 'delete') {
      if (!name) throw gumroadServiceError('name is required for delete action.');
      await client.deleteCustomField(productId, name);
      return {
        output: { deleted: true },
        message: `Deleted custom field **${name}**.`
      };
    }

    throw gumroadServiceError(`Unknown action: ${action}`);
  })
  .build();
