import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCheck = SlateTool.create(spec, {
  name: 'Create Uptime Check',
  key: 'create_check',
  description: `Creates a new uptime check that monitors the availability of a website, server, or service. Supports HTTP, HTTPS, TCP, UDP, PING, DNS, SMTP, POP3, and IMAP check types with configurable intervals, tags, and alert thresholds.`,
  instructions: [
    'The "type" field determines which type-specific fields apply. For example, HTTP checks support url, encryption, shouldContain, etc.',
    'Resolution determines how often the check runs: 1, 5, 15, 30, or 60 minutes.',
    'Use tags to organize checks into groups.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the check'),
      hostname: z.string().describe('Target hostname or IP address'),
      type: z
        .enum(['http', 'httpcustom', 'tcp', 'udp', 'ping', 'dns', 'smtp', 'pop3', 'imap'])
        .describe('Type of check to create'),
      resolution: z
        .number()
        .optional()
        .describe('Check interval in minutes: 1, 5, 15, 30, or 60. Default: 5'),
      paused: z.boolean().optional().describe('Whether to create the check in paused state'),
      tags: z.string().optional().describe('Comma-separated tags for the check'),
      ipv6: z.boolean().optional().describe('Use IPv6 instead of IPv4'),
      responseTimeThreshold: z
        .number()
        .optional()
        .describe('Response time threshold in ms before triggering alert'),
      sendNotificationWhenDown: z
        .number()
        .optional()
        .describe('Number of consecutive failures before alerting'),
      notifyAgainEvery: z
        .number()
        .optional()
        .describe('Notify again every N results while down. 0 = no repeat'),
      notifyWhenBackup: z
        .boolean()
        .optional()
        .describe('Send notification when check recovers'),
      customMessage: z.string().optional().describe('Custom message in alert notifications'),
      integrationIds: z.array(z.number()).optional().describe('Integration IDs to notify'),
      userIds: z.array(z.number()).optional().describe('User IDs to notify'),
      teamIds: z.array(z.number()).optional().describe('Team IDs to notify'),
      probeFilters: z
        .string()
        .optional()
        .describe('Probe filters, e.g. "region:NA" or "region:EU"'),
      url: z
        .string()
        .optional()
        .describe('Path to check on the hostname (HTTP/HTTPS checks). Default: "/"'),
      encryption: z.boolean().optional().describe('Use HTTPS (HTTP checks)'),
      port: z.number().optional().describe('Target port (TCP, UDP, HTTP checks)'),
      username: z.string().optional().describe('HTTP basic auth username'),
      password: z.string().optional().describe('HTTP basic auth password'),
      shouldContain: z
        .string()
        .optional()
        .describe('Response must contain this string (HTTP)'),
      shouldNotContain: z
        .string()
        .optional()
        .describe('Response must NOT contain this string (HTTP)'),
      postData: z.string().optional().describe('POST data body (HTTP)'),
      requestHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom HTTP request headers'),
      verifyCertificate: z
        .boolean()
        .optional()
        .describe('Verify SSL certificate (HTTP). Default: true'),
      sslDownDaysBefore: z
        .number()
        .optional()
        .describe('Alert N days before SSL certificate expires'),
      stringToSend: z.string().optional().describe('String to send (TCP/UDP)'),
      stringToExpect: z.string().optional().describe('Expected response string (TCP/UDP)'),
      expectedIp: z.string().optional().describe('Expected resolved IP (DNS checks)'),
      nameServer: z.string().optional().describe('Nameserver to query (DNS checks)')
    })
  )
  .output(
    z.object({
      checkId: z.number().describe('ID of the created check'),
      name: z.string().optional().describe('Name of the created check')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.auth.accountEmail
    });

    let data: Record<string, any> = {
      name: ctx.input.name,
      host: ctx.input.hostname,
      type: ctx.input.type
    };

    if (ctx.input.resolution !== undefined) data.resolution = ctx.input.resolution;
    if (ctx.input.paused !== undefined) data.paused = ctx.input.paused;
    if (ctx.input.tags) data.tags = ctx.input.tags;
    if (ctx.input.ipv6 !== undefined) data.ipv6 = ctx.input.ipv6;
    if (ctx.input.responseTimeThreshold !== undefined)
      data.responsetime_threshold = ctx.input.responseTimeThreshold;
    if (ctx.input.sendNotificationWhenDown !== undefined)
      data.sendnotificationwhendown = ctx.input.sendNotificationWhenDown;
    if (ctx.input.notifyAgainEvery !== undefined)
      data.notifyagainevery = ctx.input.notifyAgainEvery;
    if (ctx.input.notifyWhenBackup !== undefined)
      data.notifywhenbackup = ctx.input.notifyWhenBackup;
    if (ctx.input.customMessage) data.custom_message = ctx.input.customMessage;
    if (ctx.input.integrationIds?.length)
      data.integrationids = ctx.input.integrationIds.join(',');
    if (ctx.input.userIds?.length) data.userids = ctx.input.userIds.join(',');
    if (ctx.input.teamIds?.length) data.teamids = ctx.input.teamIds.join(',');
    if (ctx.input.probeFilters) data.probe_filters = ctx.input.probeFilters;
    if (ctx.input.url) data.url = ctx.input.url;
    if (ctx.input.encryption !== undefined) data.encryption = ctx.input.encryption;
    if (ctx.input.port !== undefined) data.port = ctx.input.port;
    if (ctx.input.username) data.auth = ctx.input.username;
    if (ctx.input.password) data.pass = ctx.input.password;
    if (ctx.input.shouldContain) data.shouldcontain = ctx.input.shouldContain;
    if (ctx.input.shouldNotContain) data.shouldnotcontain = ctx.input.shouldNotContain;
    if (ctx.input.postData) data.postdata = ctx.input.postData;
    if (ctx.input.requestHeaders) {
      for (let [key, value] of Object.entries(ctx.input.requestHeaders)) {
        data[`requestheader${key}`] = value;
      }
    }
    if (ctx.input.verifyCertificate !== undefined)
      data.verify_certificate = ctx.input.verifyCertificate;
    if (ctx.input.sslDownDaysBefore !== undefined)
      data.ssl_down_days_before = ctx.input.sslDownDaysBefore;
    if (ctx.input.stringToSend) data.stringtosend = ctx.input.stringToSend;
    if (ctx.input.stringToExpect) data.stringtoexpect = ctx.input.stringToExpect;
    if (ctx.input.expectedIp) data.expectedip = ctx.input.expectedIp;
    if (ctx.input.nameServer) data.nameserver = ctx.input.nameServer;

    let result = await client.createCheck(data);
    let check = result.check || result;

    return {
      output: {
        checkId: check.id,
        name: check.name || ctx.input.name
      },
      message: `Created uptime check **${ctx.input.name}** (ID: ${check.id}) of type \`${ctx.input.type}\` monitoring \`${ctx.input.hostname}\`.`
    };
  })
  .build();
