import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleAdminActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageChromeOsDevices = SlateTool.create(spec, {
  name: 'Manage ChromeOS Devices',
  key: 'manage_chromeos_devices',
  description: `List, get, update, or perform actions on ChromeOS devices. Supports searching, moving between org units, and remote actions like disable or deprovision.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .scopes(googleAdminActionScopes.manageChromeosDevices)
  .input(
    z.object({
      action: z.enum(['list', 'get', 'update', 'device_action']).describe('Action to perform'),
      deviceId: z
        .string()
        .optional()
        .describe('ChromeOS device ID (required for get, update, device_action)'),
      query: z.string().optional().describe('Search query for listing devices'),
      orgUnitPath: z.string().optional().describe('Filter by or move to org unit path'),
      annotatedUser: z
        .string()
        .optional()
        .describe('Annotated user for the device (for update)'),
      annotatedLocation: z.string().optional().describe('Annotated location (for update)'),
      annotatedAssetId: z.string().optional().describe('Annotated asset ID (for update)'),
      notes: z.string().optional().describe('Notes for the device (for update)'),
      deviceAction: z
        .enum(['disable', 'reenable', 'deprovision'])
        .optional()
        .describe('Action to perform on the device (for device_action)'),
      maxResults: z.number().optional(),
      pageToken: z.string().optional(),
      orderBy: z
        .enum([
          'annotatedLocation',
          'annotatedUser',
          'lastSync',
          'notes',
          'serialNumber',
          'status'
        ])
        .optional()
    })
  )
  .output(
    z.object({
      devices: z
        .array(
          z.object({
            deviceId: z.string().optional(),
            serialNumber: z.string().optional(),
            status: z.string().optional(),
            lastSync: z.string().optional(),
            model: z.string().optional(),
            osVersion: z.string().optional(),
            orgUnitPath: z.string().optional(),
            annotatedUser: z.string().optional(),
            annotatedLocation: z.string().optional(),
            annotatedAssetId: z.string().optional()
          })
        )
        .optional(),
      device: z
        .object({
          deviceId: z.string().optional(),
          serialNumber: z.string().optional(),
          status: z.string().optional(),
          lastSync: z.string().optional(),
          model: z.string().optional(),
          osVersion: z.string().optional(),
          platformVersion: z.string().optional(),
          firmwareVersion: z.string().optional(),
          macAddress: z.string().optional(),
          orgUnitPath: z.string().optional(),
          annotatedUser: z.string().optional(),
          annotatedLocation: z.string().optional(),
          annotatedAssetId: z.string().optional(),
          notes: z.string().optional(),
          bootMode: z.string().optional()
        })
        .optional(),
      nextPageToken: z.string().optional(),
      actionPerformed: z.string().optional(),
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
      let result = await client.listChromeOsDevices({
        query: ctx.input.query,
        orgUnitPath: ctx.input.orgUnitPath,
        maxResults: ctx.input.maxResults,
        pageToken: ctx.input.pageToken,
        orderBy: ctx.input.orderBy
      });

      let devices = (result.chromeosdevices || []).map((d: any) => ({
        deviceId: d.deviceId,
        serialNumber: d.serialNumber,
        status: d.status,
        lastSync: d.lastSync,
        model: d.model,
        osVersion: d.osVersion,
        orgUnitPath: d.orgUnitPath,
        annotatedUser: d.annotatedUser,
        annotatedLocation: d.annotatedLocation,
        annotatedAssetId: d.annotatedAssetId
      }));

      return {
        output: { devices, nextPageToken: result.nextPageToken, action: 'list' },
        message: `Found **${devices.length}** ChromeOS devices.`
      };
    }

    if (!ctx.input.deviceId) throw new Error('deviceId is required');

    if (ctx.input.action === 'get') {
      let d = await client.getChromeOsDevice(ctx.input.deviceId);
      return {
        output: {
          device: {
            deviceId: d.deviceId,
            serialNumber: d.serialNumber,
            status: d.status,
            lastSync: d.lastSync,
            model: d.model,
            osVersion: d.osVersion,
            platformVersion: d.platformVersion,
            firmwareVersion: d.firmwareVersion,
            macAddress: d.macAddress,
            orgUnitPath: d.orgUnitPath,
            annotatedUser: d.annotatedUser,
            annotatedLocation: d.annotatedLocation,
            annotatedAssetId: d.annotatedAssetId,
            notes: d.notes,
            bootMode: d.bootMode
          },
          action: 'get'
        },
        message: `Retrieved ChromeOS device **${d.serialNumber || d.deviceId}** (${d.status}).`
      };
    }

    if (ctx.input.action === 'update') {
      let updateData: Record<string, any> = {};
      if (ctx.input.orgUnitPath) updateData.orgUnitPath = ctx.input.orgUnitPath;
      if (ctx.input.annotatedUser) updateData.annotatedUser = ctx.input.annotatedUser;
      if (ctx.input.annotatedLocation)
        updateData.annotatedLocation = ctx.input.annotatedLocation;
      if (ctx.input.annotatedAssetId) updateData.annotatedAssetId = ctx.input.annotatedAssetId;
      if (ctx.input.notes !== undefined) updateData.notes = ctx.input.notes;

      let d = await client.updateChromeOsDevice(ctx.input.deviceId, updateData);
      return {
        output: {
          device: {
            deviceId: d.deviceId,
            serialNumber: d.serialNumber,
            status: d.status,
            orgUnitPath: d.orgUnitPath,
            annotatedUser: d.annotatedUser,
            annotatedLocation: d.annotatedLocation,
            annotatedAssetId: d.annotatedAssetId
          },
          action: 'update'
        },
        message: `Updated ChromeOS device **${d.serialNumber || d.deviceId}**.`
      };
    }

    // device_action
    if (!ctx.input.deviceAction) throw new Error('deviceAction is required for device_action');
    await client.performChromeOsDeviceAction(ctx.input.deviceId, ctx.input.deviceAction);
    return {
      output: { actionPerformed: ctx.input.deviceAction, action: 'device_action' },
      message: `Performed **${ctx.input.deviceAction}** on device **${ctx.input.deviceId}**.`
    };
  })
  .build();
