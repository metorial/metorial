import { SlateTool } from 'slates';
import { z } from 'zod';
import { mixpanelServiceError } from '../lib/errors';
import {
  createClientFromContext,
  requireNonEmptyRecord,
  requireNonEmptyStringArray,
  requireProjectToken
} from '../lib/helpers';
import { spec } from '../spec';

export let manageGroupProfile = SlateTool.create(spec, {
  name: 'Manage Group Profile',
  key: 'manage_group_profile',
  description: `Create or update a group profile in Mixpanel. Groups represent entity-level analytics such as companies or accounts.
Supports setting properties, setting properties only once, list-property updates, unsetting properties, or deleting the group profile entirely.
Requires Group Analytics to be enabled on the Mixpanel project.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      groupKey: z.string().describe('The group key (e.g., "company" or "account")'),
      groupId: z.string().describe('The group identifier value'),
      operation: z
        .enum(['set', 'setOnce', 'remove', 'union', 'unset', 'deleteProfile'])
        .describe('Group profile operation to perform'),
      properties: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Properties for set, setOnce, remove, and union operations. Union values must be arrays.'
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
    requireProjectToken(ctx);

    let client = createClientFromContext(ctx);
    let { groupKey, groupId, operation, properties, propertyNames } = ctx.input;
    let result: { success: boolean };

    switch (operation) {
      case 'set':
        requireNonEmptyRecord(properties, 'properties');
        result = await client.setGroupProperties(groupKey, groupId, properties ?? {});
        break;
      case 'setOnce':
        requireNonEmptyRecord(properties, 'properties');
        result = await client.setGroupPropertiesOnce(groupKey, groupId, properties ?? {});
        break;
      case 'remove':
        requireNonEmptyRecord(properties, 'properties');
        result = await client.removeFromGroupListProperty(groupKey, groupId, properties ?? {});
        break;
      case 'union':
        requireNonEmptyRecord(properties, 'properties');
        for (let [name, value] of Object.entries(properties ?? {})) {
          if (!Array.isArray(value)) {
            throw mixpanelServiceError(
              `Property "${name}" must be an array for union operations.`
            );
          }
        }
        result = await client.unionToGroupListProperty(
          groupKey,
          groupId,
          (properties ?? {}) as Record<string, unknown[]>
        );
        break;
      case 'unset':
        requireNonEmptyStringArray(propertyNames, 'propertyNames');
        result = await client.deleteGroupProperties(groupKey, groupId, propertyNames ?? []);
        break;
      case 'deleteProfile':
        result = await client.deleteGroupProfile(groupKey, groupId);
        break;
      default:
        throw mixpanelServiceError(`Unsupported group profile operation: ${operation}`);
    }

    return {
      output: { success: result.success },
      message: result.success
        ? `Successfully performed **${operation}** on group \`${groupKey}:${groupId}\`.`
        : `Failed to perform **${operation}** on group \`${groupKey}:${groupId}\`.`
    };
  })
  .build();
