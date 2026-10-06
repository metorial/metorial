import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { orgIdInput, upstream } from '../lib/validation';
import { spec } from '../spec';

export let manageAssociations = SlateTool.create(spec, {
  name: 'Manage Associations',
  key: 'manage_associations',
  description: `Manage graph associations (resource bindings) between JumpCloud objects. Associations connect users, user groups, systems, system groups, applications, RADIUS servers, LDAP servers, and other directory resources. Use this to bind or unbind resources.`,
  instructions: [
    'To bind a user group to a system group, use sourceType "user_group" and targetType "system_group".',
    'To bind a user group to an application, use sourceType "user_group" and targetType "application".',
    'Common target types: system, system_group, user, user_group, application, radius_server, ldap_server, active_directory, g_suite, office_365.',
    'Sudo is supported only on user/system native routes. A relationship acknowledgement does not prove effective access or downstream propagation.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      orgId: orgIdInput,
      action: z.enum(['add', 'remove', 'list']).describe('Action to perform'),
      sourceType: z
        .enum(['user', 'user_group', 'system', 'system_group'])
        .describe('Source resource type'),
      sourceId: z.string().describe('Source resource ID'),
      targetType: z
        .string()
        .describe(
          'Target resource type (e.g. system_group, application, radius_server, ldap_server)'
        ),
      targetId: z.string().optional().describe('Target resource ID (required for add/remove)'),
      sudoEnabled: z
        .boolean()
        .optional()
        .describe(
          'Enable sudo only for native user/system association routes; unsupported group routes are refused'
        ),
      sudoWithoutPassword: z.boolean().optional().describe('Enable passwordless sudo'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Max results for list (default 100)'),
      skip: z.number().min(0).optional().describe('Skip for pagination when listing')
    })
  )
  .output(
    z.object({
      sourceId: z.string().describe('Source resource ID'),
      sourceType: z.string().describe('Source resource type'),
      action: z.string().describe('Action performed'),
      associations: z
        .array(
          z.object({
            targetId: z.string().describe('Target resource ID'),
            targetType: z.string().describe('Target resource type')
          })
        )
        .optional()
        .describe('Current associations (returned for list action)'),
      success: z
        .boolean()
        .describe(
          'Whether the native request was accepted; effective downstream access is not confirmed'
        )
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);
    try {
      if (ctx.input.action === 'list') {
        if (
          ctx.input.targetId !== undefined ||
          ctx.input.sudoEnabled !== undefined ||
          ctx.input.sudoWithoutPassword !== undefined
        )
          throw createApiServiceError('Omit mutation fields when listing associations.');
        const associations = await client.listAssociations(
          ctx.input.sourceType,
          ctx.input.sourceId,
          ctx.input.targetType,
          { limit: ctx.input.limit, skip: ctx.input.skip }
        );

        let mapped = associations.map(a => ({
          targetId: a.to.id,
          targetType: a.to.type
        }));

        return {
          output: {
            sourceId: ctx.input.sourceId,
            sourceType: ctx.input.sourceType,
            action: 'list',
            associations: mapped,
            success: true
          },
          message: `Found **${mapped.length}** ${ctx.input.targetType} associations for ${ctx.input.sourceType} \`${ctx.input.sourceId}\`.`
        };
      }

      if (!ctx.input.targetId)
        throw createApiServiceError('targetId is required for add/remove actions');

      if (ctx.input.limit !== undefined || ctx.input.skip !== undefined)
        throw createApiServiceError('Omit paging fields when changing an association.');
      if (ctx.input.sudoWithoutPassword !== undefined && ctx.input.sudoEnabled === undefined)
        throw createApiServiceError(
          'sudoWithoutPassword requires an explicit sudoEnabled value.'
        );
      if (ctx.input.sudoWithoutPassword && !ctx.input.sudoEnabled)
        throw createApiServiceError('Passwordless sudo requires sudoEnabled true.');
      let attributes: { sudo: { enabled: boolean; withoutPassword: boolean } } | undefined;
      if (ctx.input.sudoEnabled !== undefined) {
        attributes = {
          sudo: {
            enabled: ctx.input.sudoEnabled,
            withoutPassword: ctx.input.sudoWithoutPassword ?? false
          }
        };
      }

      let body = {
        op: ctx.input.action as 'add' | 'remove',
        type: ctx.input.targetType,
        id: ctx.input.targetId,
        attributes
      };

      if (ctx.input.sourceType === 'user') {
        await client.manageUserAssociations(ctx.input.sourceId, body);
      } else if (ctx.input.sourceType === 'user_group') {
        await client.manageUserGroupAssociations(ctx.input.sourceId, body);
      } else if (ctx.input.sourceType === 'system') {
        await client.manageSystemAssociations(ctx.input.sourceId, body);
      } else {
        await client.manageSystemGroupAssociations(ctx.input.sourceId, body);
      }

      let actionLabel = ctx.input.action === 'add' ? 'Added' : 'Removed';
      return {
        output: {
          sourceId: ctx.input.sourceId,
          sourceType: ctx.input.sourceType,
          action: ctx.input.action,
          success: true
        },
        message: `${actionLabel} association: ${ctx.input.sourceType} \`${ctx.input.sourceId}\` → ${ctx.input.targetType} \`${ctx.input.targetId}\``
      };
    } catch (error) {
      throw upstream(error, client.didWrite);
    }
  })
  .build();
