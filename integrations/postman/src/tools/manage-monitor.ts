import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageMonitorTool = SlateTool.create(spec, {
  name: 'Manage Monitor',
  key: 'manage_monitor',
  description: `Create, get, update, list, or delete Postman monitors. Monitors run collections on a schedule and can be used for automated API testing, health checks, and CI/CD integration.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'list', 'delete'])
        .describe('Operation to perform'),
      monitorId: z
        .string()
        .optional()
        .describe('Monitor ID (required for get, update, delete)'),
      workspaceId: z.string().optional().describe('Workspace ID (used for create and list)'),
      name: z.string().optional().describe('Monitor name (required for create)'),
      collectionUid: z
        .string()
        .optional()
        .describe('Collection UID to run (required for create)'),
      environmentUid: z.string().optional().describe('Environment UID to use'),
      cron: z.string().optional().describe('Cron schedule expression (required for create)'),
      timezone: z
        .string()
        .optional()
        .describe('IANA timezone (required for create, e.g., "America/New_York")')
    })
  )
  .output(
    z.object({
      monitor: z
        .object({
          monitorId: z.string().optional(),
          name: z.string().optional(),
          uid: z.string().optional(),
          collectionUid: z.string().optional(),
          environmentUid: z.string().optional(),
          schedule: z
            .object({
              cron: z.string().optional(),
              timezone: z.string().optional(),
              nextRun: z.string().optional()
            })
            .optional()
        })
        .optional(),
      monitors: z
        .array(
          z.object({
            monitorId: z.string(),
            name: z.string().optional(),
            uid: z.string().optional(),
            collectionUid: z.string().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let {
      action,
      monitorId,
      workspaceId,
      name,
      collectionUid,
      environmentUid,
      cron,
      timezone
    } = ctx.input;

    let mapMonitor = (m: any) => ({
      monitorId: m.id,
      name: m.name,
      uid: m.uid,
      collectionUid: m.collectionUid,
      environmentUid: m.environmentUid,
      schedule: m.schedule
        ? {
            cron: m.schedule.cron,
            timezone: m.schedule.timezone,
            nextRun: m.schedule.nextRun
          }
        : undefined
    });

    if (action === 'list') {
      let monitors = await client.listMonitors(
        workspaceId ? { workspace: workspaceId } : undefined
      );
      let result = monitors.map((m: any) => ({
        monitorId: m.id,
        name: m.name,
        uid: m.uid,
        collectionUid: m.collectionUid
      }));
      return {
        output: { monitors: result },
        message: `Found **${result.length}** monitor(s).`
      };
    }

    if (action === 'get') {
      if (!monitorId) throw new Error('monitorId is required for get.');
      let monitor = await client.getMonitor(monitorId);
      return {
        output: { monitor: mapMonitor(monitor) },
        message: `Retrieved monitor **"${monitor.name}"**.`
      };
    }

    if (action === 'create') {
      if (!name || !collectionUid || !cron || !timezone) {
        throw new Error('name, collectionUid, cron, and timezone are required for create.');
      }
      let monitor = await client.createMonitor(
        {
          name,
          collection: collectionUid,
          environment: environmentUid,
          schedule: { cron, timezone }
        },
        workspaceId
      );
      return {
        output: { monitor: mapMonitor(monitor) },
        message: `Created monitor **"${monitor.name}"**.`
      };
    }

    if (action === 'update') {
      if (!monitorId) throw new Error('monitorId is required for update.');
      let schedule = cron || timezone ? { cron, timezone } : undefined;
      let monitor = await client.updateMonitor(monitorId, { name, schedule });
      return {
        output: { monitor: mapMonitor(monitor) },
        message: `Updated monitor **"${monitor.name ?? monitorId}"**.`
      };
    }

    if (!monitorId) throw new Error('monitorId is required for delete.');
    let monitor = await client.deleteMonitor(monitorId);
    return {
      output: { monitor: { monitorId: monitor.id, uid: monitor.uid } },
      message: `Deleted monitor **${monitorId}**.`
    };
  })
  .build();
