import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageAssociations = SlateTool.create(spec, {
  name: 'Manage Associations',
  key: 'manage_associations',
  description: `Manage graph associations (resource bindings) between JumpCloud objects. Associations connect users, user groups, systems, system groups, applications, RADIUS servers, LDAP servers, and other directory resources. Use this to bind or unbind resources.`,
  instructions: [
    'To bind a user group to a system group, use sourceType "user_group" and targetType "system_group".',
    'To bind a user group to an application, use sourceType "user_group" and targetType "application".',
    'Common target types: system, system_group, user, user_group, application, radius_server, ldap_server, active_directory, g_suite, office_365.',
    'When granting sudo access, provide sudoEnabled and optionally sudoWithoutPassword in the attributes.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
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
        .describe('Enable sudo access (for user group → system group associations)'),
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
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    if (ctx.input.action === 'list') {
      let associations: any[];
      if (ctx.input.sourceType === 'user') {
        associations = await client.getUserAssociations(
          ctx.input.sourceId,
          ctx.input.targetType,
          {
            limit: ctx.input.limit,
            skip: ctx.input.skip
          }
        );
      } else if (ctx.input.sourceType === 'user_group') {
        associations = await client.listUserGroupAssociations(
          ctx.input.sourceId,
          ctx.input.targetType,
          {
            limit: ctx.input.limit,
            skip: ctx.input.skip
          }
        );
      } else if (ctx.input.sourceType === 'system') {
        associations = await client.getSystemAssociations(
          ctx.input.sourceId,
          ctx.input.targetType,
          {
            limit: ctx.input.limit,
            skip: ctx.input.skip
          }
        );
      } else {
        let axios2 = (client as any).v2Axios();
        let response = await axios2.get(`/systemgroups/${ctx.input.sourceId}/associations`, {
          params: {
            targets: ctx.input.targetType,
            limit: ctx.input.limit ?? 100,
            skip: ctx.input.skip ?? 0
          }
        });
        associations = response.data;
      }

      let mapped = associations.map((a: any) => ({
        targetId: a.to?.id ?? a.id,
        targetType: a.to?.type ?? a.type
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

    if (!ctx.input.targetId) throw new Error('targetId is required for add/remove actions');

    let attributes: Record<string, any> | undefined;
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
  })
  .build();
