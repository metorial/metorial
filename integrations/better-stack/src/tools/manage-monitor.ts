import { SlateTool } from 'slates';
import { z } from 'zod';
import { UptimeClient } from '../lib/client';
import { spec } from '../spec';

export let manageMonitor = SlateTool.create(spec, {
  name: 'Manage Monitor',
  key: 'manage_monitor',
  description: `Create, update, pause, resume, or delete an uptime monitor. Supports HTTP, keyword, ping, TCP, UDP, SMTP, POP, and IMAP monitors with configurable check frequency, regions, expected status codes, request headers, and more.`,
  instructions: [
    'To create a monitor, set action to "create" and provide the monitor configuration.',
    'To update, set action to "update" and provide monitorId plus the fields to change.',
    'To pause or resume, set action to "pause" or "resume" with the monitorId.',
    'To delete, set action to "delete" with the monitorId.',
    'To get details, set action to "get" with the monitorId.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'get', 'pause', 'resume', 'delete'])
        .describe('Action to perform on the monitor'),
      monitorId: z
        .string()
        .optional()
        .describe('Monitor ID (required for update, get, pause, resume, delete)'),
      monitorType: z
        .string()
        .optional()
        .describe(
          'Type of monitor: status, expected_status_code, keyword, keyword_absence, ping, tcp, udp, smtp, pop, imap'
        ),
      url: z.string().optional().describe('URL or IP address to monitor'),
      pronounceableName: z.string().optional().describe('Human-readable name for the monitor'),
      checkFrequency: z
        .number()
        .optional()
        .describe('Check frequency in seconds (30, 60, 120, 180, 300, 600, 1800)'),
      requestTimeout: z
        .number()
        .optional()
        .describe('Request timeout in seconds (default: 30)'),
      expectedStatusCodes: z
        .array(z.number())
        .optional()
        .describe('Expected HTTP status codes'),
      requiredKeyword: z
        .string()
        .optional()
        .describe('Keyword that must be present/absent on the page'),
      httpMethod: z
        .string()
        .optional()
        .describe('HTTP method (GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD)'),
      requestHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom request headers as key-value pairs'),
      requestBody: z.string().optional().describe('Request body for POST/PUT/PATCH requests'),
      regions: z.array(z.string()).optional().describe('Monitoring regions: us, eu, as, au'),
      confirmationPeriod: z
        .number()
        .optional()
        .describe('How long to wait before sending an alert (0-600 seconds)'),
      sslExpiration: z
        .number()
        .optional()
        .describe('Alert when SSL certificate expires within this many days'),
      domainExpiration: z
        .number()
        .optional()
        .describe('Alert when domain expires within this many days'),
      policyId: z.string().optional().describe('Escalation policy ID to use for incidents'),
      followRedirects: z.boolean().optional().describe('Whether to follow redirects'),
      paused: z.boolean().optional().describe('Whether the monitor should be paused'),
      monitorGroupId: z
        .string()
        .optional()
        .describe('Monitor group ID to assign this monitor to'),
      maintenanceFrom: z
        .string()
        .optional()
        .describe('Start of maintenance window (ISO 8601)'),
      maintenanceTo: z.string().optional().describe('End of maintenance window (ISO 8601)')
    })
  )
  .output(
    z.object({
      monitorId: z.string().describe('Monitor ID'),
      name: z.string().nullable().describe('Monitor name'),
      url: z.string().nullable().describe('Monitored URL'),
      monitorType: z.string().nullable().describe('Monitor type'),
      status: z.string().nullable().describe('Current monitor status'),
      paused: z.boolean().nullable().describe('Whether the monitor is paused'),
      deleted: z.boolean().optional().describe('Whether the monitor was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UptimeClient({
      token: ctx.auth.token,
      teamName: ctx.config.teamName
    });

    let { action, monitorId } = ctx.input;

    if (action === 'delete') {
      if (!monitorId) throw new Error('monitorId is required for delete action');
      await client.deleteMonitor(monitorId);
      return {
        output: {
          monitorId,
          name: null,
          url: null,
          monitorType: null,
          status: null,
          paused: null,
          deleted: true
        },
        message: `Monitor **${monitorId}** deleted successfully.`
      };
    }

    if (action === 'get') {
      if (!monitorId) throw new Error('monitorId is required for get action');
      let result = await client.getMonitor(monitorId);
      let attrs = result.data?.attributes || result.data || {};
      return {
        output: {
          monitorId: String(result.data?.id || monitorId),
          name: attrs.pronounceable_name || null,
          url: attrs.url || null,
          monitorType: attrs.monitor_type || null,
          status: attrs.status || null,
          paused: attrs.paused ?? null
        },
        message: `Monitor **${attrs.pronounceable_name || monitorId}** status: ${attrs.status || 'unknown'}.`
      };
    }

    if (action === 'pause' || action === 'resume') {
      if (!monitorId) throw new Error('monitorId is required for pause/resume action');
      let result =
        action === 'pause'
          ? await client.updateMonitor(monitorId, { paused: true })
          : await client.updateMonitor(monitorId, { paused: false });
      let attrs = result.data?.attributes || result.data || {};
      return {
        output: {
          monitorId: String(result.data?.id || monitorId),
          name: attrs.pronounceable_name || null,
          url: attrs.url || null,
          monitorType: attrs.monitor_type || null,
          status: attrs.status || null,
          paused: attrs.paused ?? null
        },
        message: `Monitor **${attrs.pronounceable_name || monitorId}** ${action === 'pause' ? 'paused' : 'resumed'}.`
      };
    }

    // Build the body for create/update
    let body: Record<string, any> = {};
    if (ctx.input.monitorType) body.monitor_type = ctx.input.monitorType;
    if (ctx.input.url) body.url = ctx.input.url;
    if (ctx.input.pronounceableName) body.pronounceable_name = ctx.input.pronounceableName;
    if (ctx.input.checkFrequency) body.check_frequency = ctx.input.checkFrequency;
    if (ctx.input.requestTimeout) body.request_timeout = ctx.input.requestTimeout;
    if (ctx.input.expectedStatusCodes)
      body.expected_status_codes = ctx.input.expectedStatusCodes;
    if (ctx.input.requiredKeyword) body.required_keyword = ctx.input.requiredKeyword;
    if (ctx.input.httpMethod) body.http_method = ctx.input.httpMethod;
    if (ctx.input.requestHeaders) body.request_headers = ctx.input.requestHeaders;
    if (ctx.input.requestBody) body.request_body = ctx.input.requestBody;
    if (ctx.input.regions) body.regions = ctx.input.regions;
    if (ctx.input.confirmationPeriod !== undefined)
      body.confirmation_period = ctx.input.confirmationPeriod;
    if (ctx.input.sslExpiration !== undefined) body.ssl_expiration = ctx.input.sslExpiration;
    if (ctx.input.domainExpiration !== undefined)
      body.domain_expiration = ctx.input.domainExpiration;
    if (ctx.input.policyId) body.policy_id = ctx.input.policyId;
    if (ctx.input.followRedirects !== undefined)
      body.follow_redirects = ctx.input.followRedirects;
    if (ctx.input.paused !== undefined) body.paused = ctx.input.paused;
    if (ctx.input.monitorGroupId) body.monitor_group_id = ctx.input.monitorGroupId;
    if (ctx.input.maintenanceFrom) body.maintenance_from = ctx.input.maintenanceFrom;
    if (ctx.input.maintenanceTo) body.maintenance_to = ctx.input.maintenanceTo;

    let result: any;
    if (action === 'create') {
      result = await client.createMonitor(body);
    } else {
      if (!monitorId) throw new Error('monitorId is required for update action');
      result = await client.updateMonitor(monitorId, body);
    }

    let attrs = result.data?.attributes || result.data || {};
    return {
      output: {
        monitorId: String(result.data?.id || monitorId || ''),
        name: attrs.pronounceable_name || null,
        url: attrs.url || null,
        monitorType: attrs.monitor_type || null,
        status: attrs.status || null,
        paused: attrs.paused ?? null
      },
      message: `Monitor **${attrs.pronounceable_name || result.data?.id}** ${action === 'create' ? 'created' : 'updated'} successfully.`
    };
  })
  .build();
