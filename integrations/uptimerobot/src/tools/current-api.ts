import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  currentMonitorSchema,
  currentUserSchema,
  incidentSchema,
  invalidInput
} from '../lib/types';
import { spec } from '../spec';

let readTags = { readOnly: true, destructive: false };
let tokenInstructions = [
  'Use a Current API Token connection (API v3). Legacy API Key connections use the separate legacy tools.'
];
export let whoAmI = SlateTool.create(spec, {
  key: 'who_am_i',
  name: 'Who Am I',
  description:
    'Retrieve your current UptimeRobot account identity, monitor counts, limits and SMS credit balance using a Current API Token connection.',
  tags: readTags
})
  .input(z.object({}))
  .output(currentUserSchema)
  .handleInvocation(async ctx => ({
    output: await new Client(ctx.auth).whoAmI(),
    message: 'Retrieved account identity and limits.'
  }))
  .build();

export let listCurrentMonitors = SlateTool.create(spec, {
  key: 'list_current_monitors',
  name: 'List Current Monitors',
  description:
    'List monitors using the current UptimeRobot API with name, URL, status, tag and group filters. Returns monitoring details and a cursor for the next page. Use List Monitors with a Legacy API Key connection instead.',
  instructions: tokenInstructions,
  tags: readTags
})
  .input(
    z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('Page size; default 50, maximum 200'),
      cursor: z
        .string()
        .optional()
        .describe('nextCursor from the preceding page; retain the same filters'),
      statuses: z
        .array(z.enum(['PAUSED', 'STARTED', 'UP', 'LOOKS_DOWN', 'DOWN']))
        .optional()
        .describe('Match any listed status'),
      name: z.string().optional().describe('Case-insensitive partial monitor name'),
      url: z.string().optional().describe('Case-insensitive partial URL'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Match any listed tag name, case-sensitive'),
      groupId: z.number().int().nonnegative().optional().describe('Monitor group ID')
    })
  )
  .output(
    z.object({ monitors: z.array(currentMonitorSchema), nextCursor: z.string().nullable() })
  )
  .handleInvocation(async ctx => ({
    output: await new Client(ctx.auth).listCurrentMonitors(
      pickDefined({
        limit: ctx.input.limit,
        cursor: ctx.input.cursor,
        status: ctx.input.statuses?.join(','),
        name: ctx.input.name,
        url: ctx.input.url,
        tags: ctx.input.tags?.join(','),
        groupId: ctx.input.groupId
      })
    ),
    message: 'Retrieved a page of monitors.'
  }))
  .build();

export let getMonitor = SlateTool.create(spec, {
  key: 'get_monitor',
  name: 'Get Monitor',
  description:
    'Retrieve one UptimeRobot monitor using a Current API Token connection. Returns monitoring settings and status; private request credentials and heartbeat ping URLs are omitted.',
  instructions: tokenInstructions,
  tags: readTags
})
  .input(z.object({ monitorId: z.number().int().positive().describe('Monitor ID') }))
  .output(currentMonitorSchema)
  .handleInvocation(async ctx => ({
    output: await new Client(ctx.auth).getCurrentMonitor(ctx.input.monitorId),
    message: `Retrieved monitor ${ctx.input.monitorId}.`
  }))
  .build();

let dnsRecords = z.object({
  A: z.array(z.string()).optional(),
  AAAA: z.array(z.string()).optional(),
  CNAME: z.array(z.string()).optional(),
  MX: z.array(z.string()).optional(),
  NS: z.array(z.string()).optional(),
  TXT: z.array(z.string()).optional(),
  SRV: z.array(z.string()).optional(),
  PTR: z.array(z.string()).optional(),
  SOA: z.array(z.string()).optional(),
  SPF: z.array(z.string()).optional(),
  DNSKEY: z.array(z.string()).optional(),
  DS: z.array(z.string()).optional(),
  NSEC: z.array(z.string()).optional(),
  NSEC3: z.array(z.string()).optional()
});
export let manageMonitor = SlateTool.create(spec, {
  key: 'manage_monitor',
  name: 'Manage Monitor',
  description:
    'Create, update, pause, start or permanently delete an UptimeRobot monitor using a Current API Token connection. Supports HTTP, keyword, ping, port, heartbeat and DNS monitors. Use Create Monitor, Update Monitor or Delete Monitor with a Legacy API Key connection instead.',
  instructions: [
    ...tokenInstructions,
    'Creating a monitor starts checking the supplied endpoint. No alert contacts are assigned unless you supply them. Plan limits apply.',
    'For create, supply type, friendlyName and interval. HTTP, keyword, ping and port also require url and timeout; DNS requires url and dnsRecords. Heartbeat does not accept url or timeout.',
    'For update, supply monitorId and changed settings. Type cannot be changed. An empty assignedAlertContacts or maintenanceWindowIds array clears those assignments.',
    'Pause, start and delete accept only monitorId. Deletion permanently removes monitoring history.'
  ],
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'pause', 'start', 'delete'])
        .describe('Operation to perform'),
      monitorId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Required except when creating'),
      type: z
        .enum(['HTTP', 'KEYWORD', 'PING', 'PORT', 'HEARTBEAT', 'DNS'])
        .optional()
        .describe('Required for create; cannot be changed'),
      friendlyName: z.string().min(1).max(250).optional().describe('Required for create'),
      interval: z
        .number()
        .int()
        .min(15)
        .max(2678400)
        .optional()
        .describe(
          'Seconds between checks; create requires at least 30; your plan may require a longer interval'
        ),
      url: z
        .string()
        .min(1)
        .max(10000)
        .optional()
        .describe('URL, IP address or hostname; DNS uses the DNS server hostname'),
      timeout: z.number().int().min(0).max(60).optional().describe('Check timeout in seconds'),
      port: z
        .number()
        .int()
        .min(1)
        .max(65535)
        .optional()
        .describe('Required for PORT monitors'),
      gracePeriod: z
        .number()
        .int()
        .min(0)
        .max(86400)
        .optional()
        .describe('Heartbeat grace period in seconds'),
      keywordValue: z
        .string()
        .min(1)
        .max(500)
        .optional()
        .describe('Required for KEYWORD monitors'),
      keywordType: z
        .enum(['ALERT_EXISTS', 'ALERT_NOT_EXISTS'])
        .optional()
        .describe('Keyword alert condition, required for KEYWORD'),
      keywordCaseSensitive: z
        .boolean()
        .optional()
        .describe('Required for KEYWORD create; true means case-sensitive matching'),
      dnsRecords: dnsRecords
        .optional()
        .describe('Expected DNS records, required for DNS create'),
      httpMethodType: z
        .enum(['HEAD', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'QUERY'])
        .optional()
        .describe('HTTP request method'),
      authType: z
        .enum(['NONE', 'HTTP_BASIC', 'DIGEST', 'BEARER'])
        .optional()
        .describe('HTTP endpoint authentication'),
      httpUsername: z
        .string()
        .max(255)
        .optional()
        .describe('HTTP endpoint authentication username'),
      httpPassword: z
        .string()
        .max(255)
        .optional()
        .describe('HTTP endpoint password or bearer credential'),
      customHttpHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('HTTP headers; provider limit is 3000 serialized characters'),
      postValueData: z
        .union([z.string(), z.record(z.string(), z.unknown())])
        .optional()
        .describe('HTTP request body'),
      postValueType: z.enum(['KEY_VALUE', 'RAW_JSON']).optional().describe('HTTP body format'),
      checkSSLErrors: z.boolean().optional().describe('Check SSL certificate errors'),
      followRedirections: z.boolean().optional().describe('Follow HTTP redirects'),
      assignedAlertContacts: z
        .array(
          z.object({
            alertContactId: z.number().int().positive(),
            threshold: z.number().int().nonnegative(),
            recurrence: z.number().int().nonnegative()
          })
        )
        .optional()
        .describe(
          'Notification recipients; threshold and recurrence are minutes and must be zero on the Free plan'
        ),
      maintenanceWindowIds: z
        .array(z.number().int().positive())
        .optional()
        .describe('Maintenance windows to assign'),
      tagNames: z.array(z.string()).optional().describe('Tags to assign')
    })
  )
  .output(
    z.object({
      monitorId: z.number(),
      deleted: z.boolean(),
      monitor: currentMonitorSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let {
      action,
      monitorId,
      type,
      keywordCaseSensitive,
      dnsRecords: records,
      maintenanceWindowIds,
      ...settings
    } = ctx.input;
    let fields = pickDefined(settings);
    let hasFields =
      Object.keys(fields).length > 0 ||
      type !== undefined ||
      keywordCaseSensitive !== undefined ||
      records !== undefined ||
      maintenanceWindowIds !== undefined;
    if (action !== 'create' && monitorId === undefined)
      invalidInput('monitorId is required for this action.');
    if (action === 'create' && monitorId !== undefined)
      invalidInput('Do not provide monitorId when creating a monitor.');
    if (!['create', 'update'].includes(action)) {
      if (hasFields) invalidInput('Pause, start and delete accept only monitorId.');
      return {
        output: await new Client(ctx.auth).manageCurrentMonitor(action, monitorId),
        message: `Completed monitor ${action}.`
      };
    }
    if (action === 'update' && type !== undefined)
      invalidInput('Monitor type cannot be changed.');
    if (action === 'update' && !hasFields)
      invalidInput('Provide at least one setting to update.');
    let client = new Client(ctx.auth);
    let monitorType =
      action === 'create' ? type : (await client.getCurrentMonitor(monitorId!)).type;
    if (action === 'create') {
      if (!type || !settings.friendlyName?.trim() || settings.interval === undefined)
        invalidInput('Create requires type, friendlyName and interval.');
      if (settings.interval < 30)
        invalidInput('The create interval must be at least 30 seconds.');
      if (type !== 'HEARTBEAT' && !settings.url?.trim())
        invalidInput('This monitor type requires url.');
      if (['HTTP', 'KEYWORD', 'PING', 'PORT'].includes(type) && settings.timeout === undefined)
        invalidInput('This monitor type requires timeout.');
      if (type === 'PORT' && settings.port === undefined)
        invalidInput('PORT monitors require port.');
      if (
        type === 'KEYWORD' &&
        (!settings.keywordValue || !settings.keywordType || keywordCaseSensitive === undefined)
      )
        invalidInput(
          'KEYWORD monitors require keywordValue, keywordType and keywordCaseSensitive.'
        );
      if (
        type === 'DNS' &&
        (!records || !Object.values(records).some(values => values?.length))
      )
        invalidInput('DNS monitors require at least one expected DNS record.');
    }
    let httpKeys = [
      'httpMethodType',
      'authType',
      'httpUsername',
      'httpPassword',
      'customHttpHeaders',
      'postValueData',
      'postValueType',
      'checkSSLErrors',
      'followRedirections'
    ] as const;
    if (
      !['HTTP', 'KEYWORD'].includes(String(monitorType)) &&
      httpKeys.some(key => settings[key] !== undefined)
    )
      invalidInput('HTTP request settings require an HTTP or KEYWORD monitor.');
    if (
      monitorType !== 'KEYWORD' &&
      (settings.keywordType !== undefined ||
        settings.keywordValue !== undefined ||
        keywordCaseSensitive !== undefined)
    )
      invalidInput('Keyword settings require a KEYWORD monitor.');
    if (monitorType !== 'PORT' && settings.port !== undefined)
      invalidInput('port requires a PORT monitor.');
    if (monitorType !== 'HEARTBEAT' && settings.gracePeriod !== undefined)
      invalidInput('gracePeriod requires a HEARTBEAT monitor.');
    if (
      monitorType === 'HEARTBEAT' &&
      (settings.url !== undefined || settings.timeout !== undefined)
    )
      invalidInput('HEARTBEAT monitors do not accept url or timeout.');
    if (monitorType === 'DNS' && settings.timeout !== undefined)
      invalidInput('DNS monitors do not accept timeout.');
    if (monitorType !== 'DNS' && records !== undefined)
      invalidInput('dnsRecords requires a DNS monitor.');
    if (settings.customHttpHeaders && JSON.stringify(settings.customHttpHeaders).length > 3000)
      invalidInput('customHttpHeaders must not exceed 3000 serialized characters.');
    let body: Record<string, unknown> = {
      ...fields,
      ...(action === 'create'
        ? { type, assignedAlertContacts: settings.assignedAlertContacts ?? [] }
        : {}),
      ...(keywordCaseSensitive !== undefined
        ? {
            keywordCaseType:
              action === 'create'
                ? keywordCaseSensitive
                  ? 'CaseSensitive'
                  : 'CaseInsensitive'
                : keywordCaseSensitive
                  ? 0
                  : 1
          }
        : {}),
      ...(records ? { config: { dnsRecords: records } } : {}),
      ...(maintenanceWindowIds !== undefined
        ? { maintenanceWindowsIds: maintenanceWindowIds }
        : {})
    };
    return {
      output: await client.manageCurrentMonitor(action, monitorId, body),
      message: `Completed monitor ${action}.`
    };
  })
  .build();

export let listIncidents = SlateTool.create(spec, {
  key: 'list_incidents',
  name: 'List Incidents',
  description:
    'List UptimeRobot downtime incidents using a Current API Token connection. Filter by monitor, start-time range or currently open incidents. Returns a cursor for the next page.',
  instructions: [
    ...tokenInstructions,
    'Reuse the same filters with nextCursor. The open status filter returns ongoing incidents regardless of the supplied dates.'
  ],
  tags: readTags
})
  .input(
    z.object({
      cursor: z.string().optional().describe('nextCursor from the preceding page'),
      monitorId: z.number().int().positive().optional(),
      monitorName: z.string().optional().describe('Partial monitor name'),
      startedAfter: z.string().optional().describe('ISO 8601 timestamp'),
      startedBefore: z.string().optional().describe('ISO 8601 timestamp'),
      status: z.literal('open').optional().describe('Return ongoing incidents')
    })
  )
  .output(z.object({ incidents: z.array(incidentSchema), nextCursor: z.string().nullable() }))
  .handleInvocation(async ctx => ({
    output: await new Client(ctx.auth).listIncidents(
      pickDefined({
        cursor: ctx.input.cursor,
        monitor_id: ctx.input.monitorId,
        monitor_name: ctx.input.monitorName,
        started_after: ctx.input.startedAfter,
        started_before: ctx.input.startedBefore,
        status: ctx.input.status
      })
    ),
    message: 'Retrieved a page of incidents.'
  }))
  .build();
