import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleAdminActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageMobileDevices = SlateTool.create(spec, {
  name: 'Manage Mobile Devices',
  key: 'manage_mobile_devices',
  description: `List, get, perform actions on, or delete mobile devices. Supports searching and remote actions like approve, block, wipe, and account wipe.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .scopes(googleAdminActionScopes.manageMobileDevices)
  .input(
    z.object({
      action: z.enum(['list', 'get', 'device_action', 'delete']).describe('Action to perform'),
      resourceId: z
        .string()
        .optional()
        .describe('Mobile device resource ID (required for get, device_action, delete)'),
      query: z.string().optional().describe('Search query for listing devices'),
      deviceAction: z
        .enum([
          'admin_remote_wipe',
          'admin_account_wipe',
          'approve',
          'block',
          'cancel_remote_wipe_then_activate',
          'cancel_remote_wipe_then_block'
        ])
        .optional()
        .describe('Remote action to perform on the device'),
      maxResults: z.number().optional(),
      pageToken: z.string().optional(),
      orderBy: z
        .enum(['deviceId', 'email', 'lastSync', 'model', 'name', 'os', 'status', 'type'])
        .optional()
    })
  )
  .output(
    z.object({
      devices: z
        .array(
          z.object({
            resourceId: z.string().optional(),
            deviceId: z.string().optional(),
            name: z.array(z.string()).optional(),
            email: z.array(z.string()).optional(),
            model: z.string().optional(),
            os: z.string().optional(),
            type: z.string().optional(),
            status: z.string().optional(),
            lastSync: z.string().optional()
          })
        )
        .optional(),
      device: z
        .object({
          resourceId: z.string().optional(),
          deviceId: z.string().optional(),
          name: z.array(z.string()).optional(),
          email: z.array(z.string()).optional(),
          model: z.string().optional(),
          os: z.string().optional(),
          type: z.string().optional(),
          status: z.string().optional(),
          lastSync: z.string().optional(),
          firstSync: z.string().optional(),
          userAgent: z.string().optional()
        })
        .optional(),
      nextPageToken: z.string().optional(),
      actionPerformed: z.string().optional(),
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
      let result = await client.listMobileDevices({
        query: ctx.input.query,
        maxResults: ctx.input.maxResults,
        pageToken: ctx.input.pageToken,
        orderBy: ctx.input.orderBy
      });

      let devices = (result.mobiledevices || []).map((d: any) => ({
        resourceId: d.resourceId,
        deviceId: d.deviceId,
        name: d.name,
        email: d.email,
        model: d.model,
        os: d.os,
        type: d.type,
        status: d.status,
        lastSync: d.lastSync
      }));

      return {
        output: { devices, nextPageToken: result.nextPageToken, action: 'list' },
        message: `Found **${devices.length}** mobile devices.`
      };
    }

    if (!ctx.input.resourceId) throw new Error('resourceId is required');

    if (ctx.input.action === 'get') {
      let d = await client.getMobileDevice(ctx.input.resourceId);
      return {
        output: {
          device: {
            resourceId: d.resourceId,
            deviceId: d.deviceId,
            name: d.name,
            email: d.email,
            model: d.model,
            os: d.os,
            type: d.type,
            status: d.status,
            lastSync: d.lastSync,
            firstSync: d.firstSync,
            userAgent: d.userAgent
          },
          action: 'get'
        },
        message: `Retrieved mobile device **${d.model || d.resourceId}** (${d.status}).`
      };
    }

    if (ctx.input.action === 'device_action') {
      if (!ctx.input.deviceAction) throw new Error('deviceAction is required');
      await client.performMobileDeviceAction(ctx.input.resourceId, ctx.input.deviceAction);
      return {
        output: { actionPerformed: ctx.input.deviceAction, action: 'device_action' },
        message: `Performed **${ctx.input.deviceAction}** on mobile device **${ctx.input.resourceId}**.`
      };
    }

    // delete
    await client.deleteMobileDevice(ctx.input.resourceId);
    return {
      output: { deleted: true, action: 'delete' },
      message: `Deleted mobile device **${ctx.input.resourceId}**.`
    };
  })
  .build();
