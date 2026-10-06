import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let manageUserAttributes = SlateTool.create(spec, {
  name: 'Manage User Attributes',
  key: 'manage_user_attributes',
  description: `Set or delete custom attributes (key-value metadata) on a Retool user. Use the "set" action to update an existing attribute with a string or null, or "delete" to remove its value. The attribute name must already exist in Retool.`
})
  .input(
    z.object({
      userId: z.string().describe('The ID of the user'),
      action: z
        .enum(['set', 'delete'])
        .describe('Whether to set (create/update) or delete the attribute'),
      attributeName: z.string().describe('Name of the attribute'),
      attributeValue: z
        .any()
        .optional()
        .describe(
          'String or null value of an existing attribute (required for "set", ignored for "delete")'
        )
    })
  )
  .output(
    z.object({
      userId: z.string(),
      attributeName: z.string(),
      action: z.string(),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    if (ctx.input.action === 'set') {
      await client.setUserAttribute(
        ctx.input.userId,
        ctx.input.attributeName,
        ctx.input.attributeValue
      );
    } else {
      await client.deleteUserAttribute(ctx.input.userId, ctx.input.attributeName);
    }

    return {
      output: {
        userId: ctx.input.userId,
        attributeName: ctx.input.attributeName,
        action: ctx.input.action,
        success: true
      },
      message: `${ctx.input.action === 'set' ? 'Set' : 'Deleted'} attribute **${ctx.input.attributeName}** on user \`${ctx.input.userId}\`.`
    };
  })
  .build();
