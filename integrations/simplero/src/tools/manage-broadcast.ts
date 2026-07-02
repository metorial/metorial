import { SlateTool } from 'slates';
import { z } from 'zod';
import { SimpleroClient } from '../lib/client';
import { spec } from '../spec';

export let manageBroadcast = SlateTool.create(spec, {
  name: 'Manage Broadcast',
  key: 'manage_broadcast',
  description: `Create, list, and retrieve email broadcasts in Simplero. Supports creating broadcasts with scheduling, sending test emails, and viewing broadcast activity (opens, clicks, bounces, unsubscribes).`,
  instructions: [
    'Set deliveryType to "now" to send immediately, "later" with deliverAt for scheduling, or "draft" to save as draft.',
    'Use action "activity" to get detailed engagement metrics for a broadcast.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'send_test', 'activity'])
        .describe('Action to perform'),
      broadcastId: z
        .string()
        .optional()
        .describe('Broadcast ID (for get, send_test, activity)'),
      subject: z.string().optional().describe('Email subject line (required for create)'),
      htmlBody: z.string().optional().describe('HTML body of the broadcast'),
      senderName: z.string().optional().describe('Sender display name'),
      senderEmail: z.string().optional().describe('Sender email address'),
      replyTo: z.string().optional().describe('Reply-to email address'),
      emailTemplateId: z.number().optional().describe('Email template ID to use'),
      listIds: z.array(z.number()).optional().describe('Mailing list IDs to send to'),
      segmentIds: z.array(z.number()).optional().describe('Segment IDs to send to'),
      deliveryType: z
        .enum(['now', 'later', 'draft'])
        .optional()
        .describe('When to deliver the broadcast'),
      deliverAt: z
        .string()
        .optional()
        .describe('Scheduled delivery time (ISO 8601, used with deliveryType "later")'),
      testEmail: z.string().optional().describe('Email address to send a test broadcast to'),
      page: z.number().optional().describe('Page number for listing'),
      perPage: z.number().optional().describe('Results per page for listing'),
      from: z.string().optional().describe('Filter broadcasts from this date'),
      to: z.string().optional().describe('Filter broadcasts to this date')
    })
  )
  .output(
    z.object({
      broadcast: z.record(z.string(), z.unknown()).optional().describe('Broadcast record'),
      broadcasts: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of broadcast records'),
      activityReport: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Broadcast activity report with opens, clicks, bounces, etc.'),
      success: z.boolean().optional().describe('Whether the test send was successful'),
      statusMessage: z.string().optional().describe('Message from the test send')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SimpleroClient({
      token: ctx.auth.token,
      userAgent: ctx.config.userAgent
    });

    if (ctx.input.action === 'list') {
      let broadcasts = await client.listBroadcasts({
        page: ctx.input.page,
        perPage: ctx.input.perPage,
        from: ctx.input.from,
        to: ctx.input.to
      });
      return {
        output: { broadcasts },
        message: `Found **${broadcasts.length}** broadcast(s).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.broadcastId) throw new Error('broadcastId is required.');
      let broadcast = await client.getBroadcast(ctx.input.broadcastId);
      return {
        output: { broadcast },
        message: `Retrieved broadcast **${broadcast.subject}** (ID: ${broadcast.id}).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.subject) throw new Error('subject is required.');
      let broadcast = await client.createBroadcast({
        subject: ctx.input.subject,
        body: ctx.input.htmlBody,
        senderName: ctx.input.senderName,
        senderEmail: ctx.input.senderEmail,
        replyTo: ctx.input.replyTo,
        emailTemplateId: ctx.input.emailTemplateId,
        listIds: ctx.input.listIds,
        segmentIds: ctx.input.segmentIds,
        deliveryType: ctx.input.deliveryType,
        deliverAt: ctx.input.deliverAt
      });
      return {
        output: { broadcast },
        message: `Broadcast **${ctx.input.subject}** created (ID: ${broadcast.id}, delivery: ${ctx.input.deliveryType || 'draft'}).`
      };
    }

    if (ctx.input.action === 'send_test') {
      if (!ctx.input.broadcastId) throw new Error('broadcastId is required.');
      if (!ctx.input.testEmail) throw new Error('testEmail is required.');
      let result = await client.sendTestBroadcast(ctx.input.broadcastId, ctx.input.testEmail);
      return {
        output: {
          success: result.success as boolean,
          statusMessage: result.message as string
        },
        message: `Test broadcast sent to **${ctx.input.testEmail}**.`
      };
    }

    if (ctx.input.action === 'activity') {
      if (!ctx.input.broadcastId) throw new Error('broadcastId is required.');
      let activityReport = await client.getBroadcastActivity(ctx.input.broadcastId);
      return {
        output: { activityReport },
        message: `Retrieved activity report for broadcast **${ctx.input.broadcastId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
