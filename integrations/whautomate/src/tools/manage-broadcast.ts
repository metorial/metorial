import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageBroadcast = SlateTool.create(spec, {
  name: 'Manage Broadcast',
  key: 'manage_broadcast',
  description: `Create, retrieve, update, delete, or list WhatsApp broadcasts. Broadcasts send WhatsApp template messages to segmented audiences. Supports targeting by segments, class participants, or retargeting previous broadcast recipients.
Use **get** for delivery statistics and **get_logs** for individual delivery logs.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete', 'list', 'get_logs'])
        .describe('Action to perform'),
      broadcastId: z
        .string()
        .optional()
        .describe('Broadcast ID (required for get, update, delete, get_logs)'),
      name: z.string().optional().describe('Broadcast name'),
      type: z
        .enum(['client', 'contact', 'class', 'retarget'])
        .optional()
        .describe('Audience type (required for create)'),
      locationId: z
        .string()
        .optional()
        .describe('Sending location ID from list_locations (required for create)'),
      targetClassId: z.string().optional().describe('Class ID for a class broadcast'),
      targetClassStatus: z
        .enum([
          'ALL',
          'WAITLISTED',
          'BOOKED',
          'VISITED',
          'RESCHEDULED',
          'NO_SHOW',
          'CANCELLED'
        ])
        .optional()
        .describe('Class booking status to target'),
      retargetBroadcastId: z
        .string()
        .optional()
        .describe('Previous broadcast ID for retargeting'),
      retargetEngagementType: z
        .enum(['sent', 'delivered', 'read', 'replied', 'not-replied'])
        .optional()
        .describe('Engagement to target for retarget broadcasts'),
      templateName: z.string().optional().describe('WhatsApp template name'),
      templateLanguage: z.string().optional().describe('Template language code'),
      segmentIds: z.array(z.string()).optional().describe('Segment IDs to target'),
      templateParameters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Template parameters (header, body, button URL, etc.)'),
      mediaUrl: z.string().optional().describe('Media URL for template header'),
      scheduleDateTime: z
        .string()
        .optional()
        .describe('UTC datetime to schedule the broadcast (ISO 8601)'),
      page: z.number().optional().describe('Page number (for list and get_logs)'),
      pageSize: z.number().optional().describe('Results per page (for list and get_logs)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      broadcast: z.record(z.string(), z.any()).optional().describe('Broadcast record'),
      broadcasts: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of broadcasts'),
      logs: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Broadcast delivery logs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiHost: ctx.config.apiHost
    });

    let { action } = ctx.input;

    if (action === 'create') {
      let data: Record<string, any> = {
        type: ctx.input.type,
        locationId: ctx.input.locationId,
        targetClassId: ctx.input.targetClassId,
        targetClassStatus: ctx.input.targetClassStatus,
        retargetBroadcastId: ctx.input.retargetBroadcastId,
        retargetEngagementType: ctx.input.retargetEngagementType
      };
      if (ctx.input.name) data.name = ctx.input.name;
      if (ctx.input.templateName) data.templateName = ctx.input.templateName;
      if (ctx.input.templateLanguage) data.templateLanguage = ctx.input.templateLanguage;
      if (ctx.input.segmentIds) data.segmentIds = ctx.input.segmentIds;
      if (ctx.input.templateParameters) {
        for (let key of [
          'headerMediaUrl',
          'headerTextParameters',
          'bodyTextParameters',
          'buttonUrlParameters',
          'locationParameters',
          'flowParameters'
        ]) {
          if (ctx.input.templateParameters[key] !== undefined)
            data[key] = ctx.input.templateParameters[key];
        }
      }
      if (ctx.input.mediaUrl) data.mediaUrl = ctx.input.mediaUrl;
      if (ctx.input.scheduleDateTime) data.scheduleDateTime = ctx.input.scheduleDateTime;

      let result = await client.createBroadcast(data);
      return {
        output: { success: true, broadcast: result },
        message: `Created broadcast **${ctx.input.name || result.name || ''}**.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.broadcastId)
        throw createApiServiceError('broadcastId is required for get');
      let result = await client.getBroadcast(ctx.input.broadcastId);
      return {
        output: { success: true, broadcast: result },
        message: `Retrieved broadcast **${result.name || ctx.input.broadcastId}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.broadcastId)
        throw createApiServiceError('broadcastId is required for update');
      let data: Record<string, any> = {
        type: ctx.input.type,
        locationId: ctx.input.locationId,
        targetClassId: ctx.input.targetClassId,
        targetClassStatus: ctx.input.targetClassStatus,
        retargetBroadcastId: ctx.input.retargetBroadcastId,
        retargetEngagementType: ctx.input.retargetEngagementType
      };
      if (ctx.input.name) data.name = ctx.input.name;
      if (ctx.input.templateName) data.templateName = ctx.input.templateName;
      if (ctx.input.templateLanguage) data.templateLanguage = ctx.input.templateLanguage;
      if (ctx.input.segmentIds) data.segmentIds = ctx.input.segmentIds;
      if (ctx.input.templateParameters) {
        for (let key of [
          'headerMediaUrl',
          'headerTextParameters',
          'bodyTextParameters',
          'buttonUrlParameters',
          'locationParameters',
          'flowParameters'
        ]) {
          if (ctx.input.templateParameters[key] !== undefined)
            data[key] = ctx.input.templateParameters[key];
        }
      }
      if (ctx.input.mediaUrl) data.mediaUrl = ctx.input.mediaUrl;
      if (ctx.input.scheduleDateTime) data.scheduleDateTime = ctx.input.scheduleDateTime;

      let result = await client.updateBroadcast(ctx.input.broadcastId, data);
      return {
        output: { success: true, broadcast: result },
        message: `Updated broadcast **${ctx.input.broadcastId}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.broadcastId)
        throw createApiServiceError('broadcastId is required for delete');
      await client.deleteBroadcast(ctx.input.broadcastId);
      return {
        output: { success: true },
        message: `Deleted broadcast ${ctx.input.broadcastId}.`
      };
    }

    if (action === 'list') {
      let result = await client.listBroadcasts({
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      });
      let broadcasts = Array.isArray(result) ? result : result.broadcasts || result.data || [];
      return {
        output: { success: true, broadcasts },
        message: `Found **${broadcasts.length}** broadcast(s).`
      };
    }

    if (action === 'get_logs') {
      if (!ctx.input.broadcastId)
        throw createApiServiceError('broadcastId is required for get_logs');
      let result = await client.getBroadcastLogs(ctx.input.broadcastId, {
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      });
      let logs = Array.isArray(result) ? result : result.logs || result.data || [];
      return {
        output: { success: true, logs },
        message: `Retrieved **${logs.length}** delivery log(s) for broadcast ${ctx.input.broadcastId}.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
