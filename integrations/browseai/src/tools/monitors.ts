import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  numeric,
  objects,
  optionalNumber,
  optionalObject,
  optionalText,
  rawSchema,
  text
} from '../lib/response';
import { spec } from '../spec';

let robotId = z.string().describe('Robot ID. Call list_robots to discover robots.');
let monitorId = z.string().describe('Monitor ID. Call list_monitors to discover monitors.');
let fields = {
  name: z.string().min(1).max(200).describe('Name for this scheduled monitor'),
  inputParameters: z
    .record(z.string(), z.unknown())
    .describe('Parameter overrides; call get_robot to discover the robot inputs'),
  schedule: z
    .string()
    .describe(
      'Recurring schedule expression, for example FREQ=HOURLY;INTERVAL=1;BYWEEKDAY=MO,TU,WE,TH,FR'
    ),
  notifyOnCapturedScreenshotChange: z
    .boolean()
    .describe('Email when captured screenshots change'),
  notifyOnCapturedTextChange: z.boolean().describe('Email when captured text changes'),
  capturedScreenshotNotificationThreshold: z
    .number()
    .describe('Screenshot change percentage threshold for email notifications')
};
let monitorSchema = z.object({
  monitorId: z.string().describe('Monitor ID'),
  name: z.string().describe('Monitor name'),
  status: z.string().describe('Monitor state, such as active or paused'),
  schedule: z.string().optional().describe('Recurring schedule expression'),
  pausedReason: z.string().optional().describe('Reason Browse AI paused the monitor'),
  inputParameters: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Monitor input overrides'),
  createdAt: z.number().optional().describe('Creation timestamp in milliseconds'),
  pausedAt: z.number().optional().describe('Pause timestamp in milliseconds'),
  updatedAt: z.number().optional().describe('Update timestamp in milliseconds'),
  raw: rawSchema
});
let mapMonitor = (monitor: Record<string, unknown>) => ({
  monitorId: text(monitor.id, 'monitor ID'),
  name: text(monitor.name, 'monitor name'),
  status: text(monitor.status, 'monitor status'),
  ...pickDefined({
    schedule: optionalText(monitor.schedule, 'monitor schedule'),
    pausedReason: optionalText(monitor.pausedReason, 'monitor pause reason'),
    inputParameters: optionalObject(monitor.inputParameters, 'monitor input parameters'),
    createdAt: optionalNumber(monitor.createdAt, 'monitor creation timestamp'),
    pausedAt: optionalNumber(monitor.pausedAt, 'monitor pause timestamp'),
    updatedAt: optionalNumber(monitor.updatedAt, 'monitor update timestamp')
  }),
  raw: monitor
});

export let listMonitors = SlateTool.create(spec, {
  key: 'list_monitors',
  name: 'List Monitors',
  description:
    'List a robot’s scheduled monitors, their IDs, schedules, notification settings, and pause reasons. Call list_robots first to discover robot IDs.',
  tags: { readOnly: true }
})
  .input(z.object({ robotId }))
  .output(
    z.object({
      totalCount: z.number().describe('Provider-reported monitor count'),
      monitors: z.array(monitorSchema),
      raw: rawSchema
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).listMonitors(ctx.input.robotId);
    let monitors = objects(result.items, 'monitors').map(mapMonitor);
    return {
      output: {
        totalCount: numeric(result.totalCount, 'monitor count'),
        monitors,
        raw: result
      },
      message: `Retrieved **${monitors.length}** monitor(s).`
    };
  })
  .build();

export let getMonitor = SlateTool.create(spec, {
  key: 'get_monitor',
  name: 'Get Monitor',
  description:
    'Retrieve a scheduled monitor’s current status, schedule, parameter overrides, notifications, and pause details. Discover IDs with list_robots and list_monitors.',
  tags: { readOnly: true }
})
  .input(z.object({ robotId, monitorId }))
  .output(monitorSchema)
  .handleInvocation(async ctx => {
    let output = mapMonitor(
      await new Client(ctx.auth).getMonitor(ctx.input.robotId, ctx.input.monitorId)
    );
    return { output, message: `Monitor \`${output.monitorId}\` is **${output.status}**.` };
  })
  .build();

export let createMonitor = SlateTool.create(spec, {
  key: 'create_monitor',
  name: 'Create Monitor',
  description:
    'Create a scheduled monitor with its own input parameters and change notification settings. Call list_robots and get_robot to discover a robot and its inputs.'
})
  .input(z.object({ robotId, ...fields, schedule: fields.schedule.optional() }))
  .output(monitorSchema)
  .handleInvocation(async ctx => {
    let { robotId, ...data } = ctx.input;
    let output = mapMonitor(
      await new Client(ctx.auth).createMonitor(robotId, pickDefined(data))
    );
    return { output, message: `Created monitor \`${output.monitorId}\`.` };
  })
  .build();

export let updateMonitor = SlateTool.create(spec, {
  key: 'update_monitor',
  name: 'Update Monitor',
  description:
    'Change a monitor’s schedule, input parameters, notifications, or name; pause it with status paused or resume with status active. Discover IDs with list_robots and list_monitors.'
})
  .input(
    z.object({
      robotId,
      monitorId,
      name: fields.name.optional(),
      inputParameters: fields.inputParameters.optional(),
      schedule: fields.schedule.optional(),
      status: z.enum(['active', 'paused']).optional().describe('Pause or resume the monitor'),
      notifyOnCapturedScreenshotChange: fields.notifyOnCapturedScreenshotChange.optional(),
      notifyOnCapturedTextChange: fields.notifyOnCapturedTextChange.optional(),
      capturedScreenshotNotificationThreshold:
        fields.capturedScreenshotNotificationThreshold.optional()
    })
  )
  .output(monitorSchema)
  .handleInvocation(async ctx => {
    let { robotId, monitorId, ...data } = ctx.input;
    let changes = pickDefined(data);
    if (Object.keys(changes).length === 0)
      throw createApiServiceError('Provide at least one monitor field to update.');
    let output = mapMonitor(
      await new Client(ctx.auth).updateMonitor(robotId, monitorId, changes)
    );
    return { output, message: `Updated monitor \`${output.monitorId}\`.` };
  })
  .build();

export let deleteMonitor = SlateTool.create(spec, {
  key: 'delete_monitor',
  name: 'Delete Monitor',
  description:
    'Permanently delete a scheduled monitor. Discover the monitor ID with list_monitors.',
  tags: { destructive: true }
})
  .input(z.object({ robotId, monitorId }))
  .output(
    z.object({
      success: z.boolean().describe('Whether Browse AI confirmed deletion'),
      raw: rawSchema
    })
  )
  .handleInvocation(async ctx => {
    let raw = await new Client(ctx.auth).deleteMonitor(ctx.input.robotId, ctx.input.monitorId);
    return {
      output: { success: true, raw },
      message: `Deleted monitor \`${ctx.input.monitorId}\`.`
    };
  })
  .build();
