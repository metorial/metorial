import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageProperty = SlateTool.create(spec, {
  name: 'Manage Contact Property',
  key: 'manage_property',
  description: `Update or delete a custom contact property in your Mailercloud account. When updating, you can change the property's name and description (type cannot be changed via API). When deleting, the property will be permanently removed.`,
  instructions: [
    'Properties used in webforms cannot be deleted.',
    'Only the name and description of a custom property can be edited—the type is immutable.'
  ],
  constraints: [
    'Cannot edit the property type via the API.',
    'Cannot delete properties that are used in webforms.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      propertyId: z.string().describe('ID of the custom property to manage'),
      action: z.enum(['update', 'delete']).describe('Action to perform on the property'),
      name: z.string().optional().describe('New name for the property (for update action)'),
      description: z
        .string()
        .optional()
        .describe('New description for the property (for update action)')
    })
  )
  .output(
    z
      .object({
        propertyId: z.string().describe('ID of the managed property'),
        action: z.string().describe('Action that was performed')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'delete') {
      await client.deleteProperty(ctx.input.propertyId);
      return {
        output: {
          propertyId: ctx.input.propertyId,
          action: 'deleted'
        },
        message: `Successfully deleted property \`${ctx.input.propertyId}\`.`
      };
    }

    let result = await client.updateProperty(ctx.input.propertyId, {
      name: ctx.input.name,
      description: ctx.input.description
    });

    let data = result?.data ?? result;

    return {
      output: {
        propertyId: ctx.input.propertyId,
        action: 'updated',
        ...data
      },
      message: `Successfully updated property \`${ctx.input.propertyId}\`.`
    };
  })
  .build();
