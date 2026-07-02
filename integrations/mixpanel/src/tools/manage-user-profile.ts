import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

export let manageUserProfile = SlateTool.create(spec, {
  name: 'Manage User Profile',
  key: 'manage_user_profile',
  description: `Create or update a user profile in Mixpanel. Supports multiple operations: setting properties, setting properties only if not already set, incrementing numeric properties, appending/removing values from list properties, unsetting properties, or deleting the entire profile.
Provide the desired operation and the corresponding data.`,
  instructions: [
    'Use "set" to overwrite properties. Use "setOnce" to set only if not already defined.',
    'Use "increment" to add to numeric properties (can be negative to decrement).',
    'Use "deleteProfile" to permanently remove the user profile.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      distinctId: z.string().describe('Unique identifier for the user'),
      operation: z
        .enum([
          'set',
          'setOnce',
          'increment',
          'append',
          'remove',
          'union',
          'unset',
          'deleteProfile'
        ])
        .describe('Profile operation to perform'),
      properties: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Properties to set/update (for set, setOnce, increment, append, remove, union operations)'
        ),
      propertyNames: z
        .array(z.string())
        .optional()
        .describe('Property names to unset (for unset operation)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let { distinctId, operation, properties, propertyNames } = ctx.input;
    let result: { success: boolean };

    switch (operation) {
      case 'set':
        result = await client.setUserProperties(distinctId, properties ?? {});
        break;
      case 'setOnce':
        result = await client.setUserPropertiesOnce(distinctId, properties ?? {});
        break;
      case 'increment':
        result = await client.incrementUserProperties(
          distinctId,
          (properties ?? {}) as Record<string, number>
        );
        break;
      case 'append':
        result = await client.appendToUserListProperty(distinctId, properties ?? {});
        break;
      case 'remove':
        result = await client.removeFromUserListProperty(distinctId, properties ?? {});
        break;
      case 'union':
        result = await client.unionToUserListProperty(
          distinctId,
          (properties ?? {}) as Record<string, unknown[]>
        );
        break;
      case 'unset':
        result = await client.deleteUserProperties(distinctId, propertyNames ?? []);
        break;
      case 'deleteProfile':
        result = await client.deleteUserProfile(distinctId);
        break;
      default:
        result = { success: false };
    }

    return {
      output: { success: result.success },
      message: result.success
        ? `Successfully performed **${operation}** on user profile \`${distinctId}\`.`
        : `Failed to perform **${operation}** on user profile \`${distinctId}\`.`
    };
  })
  .build();
