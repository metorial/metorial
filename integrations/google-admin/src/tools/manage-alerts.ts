import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleAdminActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageAlerts = SlateTool.create(spec, {
  name: 'Manage Alerts',
  key: 'manage_alerts',
  description: `List, get, delete, undelete, or provide feedback on security alerts from the Google Workspace Alert Center. Alerts cover threats like phishing, malware, suspicious logins, and policy violations.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .scopes(googleAdminActionScopes.manageAlerts)
  .input(
    z.object({
      action: z
        .enum([
          'list',
          'get',
          'delete',
          'undelete',
          'add_feedback',
          'list_feedback',
          'get_metadata'
        ])
        .describe('Action to perform'),
      alertId: z
        .string()
        .optional()
        .describe(
          'Alert ID (required for get, delete, undelete, add_feedback, list_feedback, get_metadata)'
        ),
      filter: z
        .string()
        .optional()
        .describe('Filter for list action (e.g. \'createTime >= "2024-01-01T00:00:00Z"\')'),
      orderBy: z
        .string()
        .optional()
        .describe('Order for list action (e.g. "create_time desc")'),
      pageSize: z.number().optional().describe('Page size for list (max 50). Defaults to 20.'),
      pageToken: z.string().optional(),
      feedbackType: z
        .enum([
          'ALERT_FEEDBACK_TYPE_UNSPECIFIED',
          'NOT_USEFUL',
          'SOMEWHAT_USEFUL',
          'VERY_USEFUL'
        ])
        .optional()
        .describe('Feedback type (for add_feedback)')
    })
  )
  .output(
    z.object({
      alerts: z
        .array(
          z.object({
            alertId: z.string().optional(),
            customerId: z.string().optional(),
            type: z.string().optional(),
            source: z.string().optional(),
            createTime: z.string().optional(),
            startTime: z.string().optional(),
            endTime: z.string().optional(),
            securityInvestigationToolLink: z.string().optional()
          })
        )
        .optional(),
      alert: z
        .object({
          alertId: z.string().optional(),
          customerId: z.string().optional(),
          type: z.string().optional(),
          source: z.string().optional(),
          createTime: z.string().optional(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          updateTime: z.string().optional(),
          securityInvestigationToolLink: z.string().optional(),
          alertData: z.any().optional()
        })
        .optional(),
      feedback: z
        .array(
          z.object({
            feedbackId: z.string().optional(),
            alertId: z.string().optional(),
            type: z.string().optional(),
            createTime: z.string().optional(),
            email: z.string().optional()
          })
        )
        .optional(),
      metadata: z
        .object({
          alertId: z.string().optional(),
          customerId: z.string().optional(),
          status: z.string().optional(),
          assignee: z.string().optional(),
          updateTime: z.string().optional(),
          severity: z.string().optional(),
          etag: z.string().optional()
        })
        .optional(),
      nextPageToken: z.string().optional(),
      deleted: z.boolean().optional(),
      action: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      customerId: ctx.config.customerId,
      domain: ctx.config.domain
    });

    if (ctx.input.action === 'list') {
      let result = await client.listAlerts({
        filter: ctx.input.filter,
        orderBy: ctx.input.orderBy,
        pageSize: ctx.input.pageSize,
        pageToken: ctx.input.pageToken
      });

      let alerts = (result.alerts || []).map((a: any) => ({
        alertId: a.alertId,
        customerId: a.customerId,
        type: a.type,
        source: a.source,
        createTime: a.createTime,
        startTime: a.startTime,
        endTime: a.endTime,
        securityInvestigationToolLink: a.securityInvestigationToolLink
      }));

      return {
        output: { alerts, nextPageToken: result.nextPageToken, action: 'list' },
        message: `Found **${alerts.length}** alerts.`
      };
    }

    if (!ctx.input.alertId) throw new Error('alertId is required');

    if (ctx.input.action === 'get') {
      let a = await client.getAlert(ctx.input.alertId);
      return {
        output: {
          alert: {
            alertId: a.alertId,
            customerId: a.customerId,
            type: a.type,
            source: a.source,
            createTime: a.createTime,
            startTime: a.startTime,
            endTime: a.endTime,
            updateTime: a.updateTime,
            securityInvestigationToolLink: a.securityInvestigationToolLink,
            alertData: a.data
          },
          action: 'get'
        },
        message: `Retrieved alert **${a.type}** from ${a.source} (created ${a.createTime}).`
      };
    }

    if (ctx.input.action === 'delete') {
      await client.deleteAlert(ctx.input.alertId);
      return {
        output: { deleted: true, action: 'delete' },
        message: `Deleted alert **${ctx.input.alertId}**.`
      };
    }

    if (ctx.input.action === 'undelete') {
      let a = await client.undeleteAlert(ctx.input.alertId);
      return {
        output: {
          alert: {
            alertId: a.alertId,
            type: a.type,
            source: a.source,
            createTime: a.createTime
          },
          action: 'undelete'
        },
        message: `Restored alert **${ctx.input.alertId}**.`
      };
    }

    if (ctx.input.action === 'add_feedback') {
      if (!ctx.input.feedbackType) throw new Error('feedbackType is required');
      let f = await client.createAlertFeedback(ctx.input.alertId, ctx.input.feedbackType);
      return {
        output: {
          feedback: [
            {
              feedbackId: f.feedbackId,
              alertId: f.alertId,
              type: f.type,
              createTime: f.createTime,
              email: f.email
            }
          ],
          action: 'add_feedback'
        },
        message: `Added **${ctx.input.feedbackType}** feedback to alert **${ctx.input.alertId}**.`
      };
    }

    if (ctx.input.action === 'list_feedback') {
      let result = await client.listAlertFeedback(ctx.input.alertId);
      let feedback = (result.feedback || []).map((f: any) => ({
        feedbackId: f.feedbackId,
        alertId: f.alertId,
        type: f.type,
        createTime: f.createTime,
        email: f.email
      }));
      return {
        output: { feedback, action: 'list_feedback' },
        message: `Found **${feedback.length}** feedback entries for alert **${ctx.input.alertId}**.`
      };
    }

    // get_metadata
    let m = await client.getAlertMetadata(ctx.input.alertId);
    return {
      output: {
        metadata: {
          alertId: m.alertId,
          customerId: m.customerId,
          status: m.status,
          assignee: m.assignee,
          updateTime: m.updateTime,
          severity: m.severity,
          etag: m.etag
        },
        action: 'get_metadata'
      },
      message: `Retrieved metadata for alert **${ctx.input.alertId}** (status: ${m.status || 'unknown'}).`
    };
  })
  .build();
