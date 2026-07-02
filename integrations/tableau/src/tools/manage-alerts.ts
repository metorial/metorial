import { SlateTool } from 'slates';
import { z } from 'zod';
import { tableauServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageAlerts = SlateTool.create(spec, {
  name: 'Manage Data-Driven Alerts',
  key: 'manage_alerts',
  description: `List, get, delete data-driven alerts, and add or remove users from alert recipient lists. Data-driven alerts trigger when data in a view meets specified conditions.`
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'delete', 'addUser', 'removeUser'])
        .describe('Operation to perform'),
      alertId: z
        .string()
        .optional()
        .describe('Alert LUID (required for get, delete, addUser, removeUser)'),
      userId: z.string().optional().describe('User LUID (for addUser, removeUser)'),
      pageSize: z.number().optional().describe('Page size for list'),
      pageNumber: z.number().optional().describe('Page number for list')
    })
  )
  .output(
    z.object({
      alerts: z
        .array(
          z.object({
            alertId: z.string(),
            subject: z.string().optional(),
            creatorId: z.string().optional(),
            createdAt: z.string().optional(),
            updatedAt: z.string().optional()
          })
        )
        .optional(),
      alert: z
        .object({
          alertId: z.string(),
          subject: z.string().optional(),
          creatorId: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional(),
          frequency: z.string().optional(),
          ownerName: z.string().optional()
        })
        .optional(),
      totalCount: z.number().optional(),
      deleted: z.boolean().optional(),
      userAdded: z.boolean().optional(),
      userRemoved: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.queryAlerts({
        pageSize: ctx.input.pageSize,
        pageNumber: ctx.input.pageNumber
      });
      let alerts = (result.dataAlerts?.dataAlert || []).map((a: any) => ({
        alertId: a.id,
        subject: a.subject,
        creatorId: a.creator?.id,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt
      }));
      return {
        output: { alerts, totalCount: alerts.length },
        message: `Found **${alerts.length}** data-driven alerts.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.alertId) throw tableauServiceError('alertId is required for get action.');

      let a = await client.getAlert(ctx.input.alertId);
      return {
        output: {
          alert: {
            alertId: a.id,
            subject: a.subject,
            creatorId: a.creator?.id,
            createdAt: a.createdAt,
            updatedAt: a.updatedAt,
            frequency: a.frequency,
            ownerName: a.owner?.name
          }
        },
        message: `Retrieved alert **${a.subject}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.alertId)
        throw tableauServiceError('alertId is required for delete action.');

      await client.deleteAlert(ctx.input.alertId);
      return {
        output: { deleted: true },
        message: `Deleted alert \`${ctx.input.alertId}\`.`
      };
    }

    if (action === 'addUser') {
      if (!ctx.input.alertId) {
        throw tableauServiceError('alertId is required for addUser action.');
      }
      if (!ctx.input.userId)
        throw tableauServiceError('userId is required for addUser action.');

      await client.addUserToAlert(ctx.input.alertId, ctx.input.userId);
      return {
        output: { userAdded: true },
        message: `Added user \`${ctx.input.userId}\` to alert \`${ctx.input.alertId}\`.`
      };
    }

    if (action === 'removeUser') {
      if (!ctx.input.alertId) {
        throw tableauServiceError('alertId is required for removeUser action.');
      }
      if (!ctx.input.userId)
        throw tableauServiceError('userId is required for removeUser action.');

      await client.removeUserFromAlert(ctx.input.alertId, ctx.input.userId);
      return {
        output: { userRemoved: true },
        message: `Removed user \`${ctx.input.userId}\` from alert \`${ctx.input.alertId}\`.`
      };
    }

    throw tableauServiceError(`Unknown action: ${action}`);
  })
  .build();
