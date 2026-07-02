import { SlateTool } from 'slates';
import { z } from 'zod';
import { TomTomClient } from '../lib/client';
import { spec } from '../spec';

export let createGeofenceAlert = SlateTool.create(spec, {
  name: 'Create Geofence Alert',
  key: 'create_geofence_alert',
  description: `Create an alert on a geofence that sends notifications when a tracked object enters, exits, or dwells within the fence. Alerts are delivered to a specified notification contact group via webhooks or email.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the geofencing project'),
      fenceId: z.string().describe('ID of the geofence to alert on'),
      objectId: z.string().describe('ID of the tracked object to monitor'),
      notificationGroupId: z.string().describe('ID of the contact group to receive alerts'),
      alertType: z
        .enum(['ENTER', 'EXIT', 'DWELL'])
        .describe('Type of transition to trigger the alert')
    })
  )
  .output(
    z.object({
      alertId: z.string().describe('ID of the created alert'),
      alertType: z.string().describe('Type of alert created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TomTomClient({ token: ctx.auth.token, adminKey: ctx.auth.adminKey });

    let data = await client.createAlert({
      projectId: ctx.input.projectId,
      fenceId: ctx.input.fenceId,
      objectId: ctx.input.objectId,
      notificationGroupId: ctx.input.notificationGroupId,
      type: ctx.input.alertType
    });

    return {
      output: {
        alertId: data.id || data.alertId,
        alertType: data.type || ctx.input.alertType
      },
      message: `Created **${ctx.input.alertType}** alert on fence \`${ctx.input.fenceId}\` for object \`${ctx.input.objectId}\`.`
    };
  })
  .build();

export let listGeofenceAlerts = SlateTool.create(spec, {
  name: 'List Geofence Alerts',
  key: 'list_geofence_alerts',
  description: `List all alerts configured on a specific geofence.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the geofencing project'),
      fenceId: z.string().describe('ID of the geofence')
    })
  )
  .output(
    z.object({
      alerts: z
        .array(
          z.object({
            alertId: z.string().describe('Alert identifier'),
            alertType: z.string().optional().describe('Alert type (ENTER, EXIT, DWELL)'),
            objectId: z.string().optional().describe('Monitored object ID'),
            notificationGroupId: z
              .string()
              .optional()
              .describe('Contact group receiving the alert')
          })
        )
        .describe('Configured alerts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TomTomClient({ token: ctx.auth.token, adminKey: ctx.auth.adminKey });

    let data = await client.listAlerts({
      projectId: ctx.input.projectId,
      fenceId: ctx.input.fenceId
    });

    let alerts = (data.alerts || data || []).map((a: any) => ({
      alertId: a.id || a.alertId,
      alertType: a.type,
      objectId: a.object,
      notificationGroupId: a.notificationGroup
    }));

    return {
      output: { alerts },
      message: `Found **${alerts.length}** alert(s) on fence \`${ctx.input.fenceId}\`.`
    };
  })
  .build();

export let deleteGeofenceAlert = SlateTool.create(spec, {
  name: 'Delete Geofence Alert',
  key: 'delete_geofence_alert',
  description: `Delete a geofence alert to stop receiving notifications for a specific transition.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the geofencing project'),
      fenceId: z.string().describe('ID of the geofence'),
      alertId: z.string().describe('ID of the alert to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the alert was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TomTomClient({ token: ctx.auth.token, adminKey: ctx.auth.adminKey });

    await client.deleteAlert({
      projectId: ctx.input.projectId,
      fenceId: ctx.input.fenceId,
      alertId: ctx.input.alertId
    });

    return {
      output: { deleted: true },
      message: `Deleted alert \`${ctx.input.alertId}\` from fence \`${ctx.input.fenceId}\`.`
    };
  })
  .build();
