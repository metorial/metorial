import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCheck = SlateTool.create(spec, {
  name: 'Update Uptime Check',
  key: 'update_check',
  description: `Updates an existing uptime check's configuration. You can modify the name, hostname, resolution, paused state, notification settings, tags, and type-specific parameters. Only provide the fields you want to change.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      checkId: z.number().describe('ID of the check to update'),
      name: z.string().optional().describe('New check name'),
      hostname: z.string().optional().describe('New target hostname'),
      resolution: z
        .number()
        .optional()
        .describe('Check interval in minutes: 1, 5, 15, 30, or 60'),
      paused: z.boolean().optional().describe('Pause or unpause the check'),
      tags: z.string().optional().describe('Comma-separated tags'),
      ipv6: z.boolean().optional().describe('Use IPv6'),
      responseTimeThreshold: z.number().optional().describe('Response time threshold in ms'),
      sendNotificationWhenDown: z
        .number()
        .optional()
        .describe('Consecutive failures before alerting'),
      notifyAgainEvery: z
        .number()
        .optional()
        .describe('Notify again every N results while down'),
      notifyWhenBackup: z.boolean().optional().describe('Notify when check recovers'),
      customMessage: z.string().optional().describe('Custom alert notification message'),
      integrationIds: z.array(z.number()).optional().describe('Integration IDs to notify'),
      userIds: z.array(z.number()).optional().describe('User IDs to notify'),
      teamIds: z.array(z.number()).optional().describe('Team IDs to notify'),
      probeFilters: z.string().optional().describe('Probe region filters'),
      url: z.string().optional().describe('Path on the hostname (HTTP)'),
      encryption: z.boolean().optional().describe('Use HTTPS (HTTP checks)'),
      port: z.number().optional().describe('Target port'),
      username: z.string().optional().describe('HTTP basic auth username'),
      password: z.string().optional().describe('HTTP basic auth password'),
      shouldContain: z.string().optional().describe('Required response content (HTTP)'),
      shouldNotContain: z.string().optional().describe('Forbidden response content (HTTP)'),
      postData: z.string().optional().describe('POST body data (HTTP)'),
      verifyCertificate: z.boolean().optional().describe('Verify SSL certificate (HTTP)'),
      sslDownDaysBefore: z.number().optional().describe('Days before SSL expiry to alert'),
      stringToSend: z.string().optional().describe('String to send (TCP/UDP)'),
      stringToExpect: z.string().optional().describe('Expected response string (TCP/UDP)'),
      expectedIp: z.string().optional().describe('Expected resolved IP (DNS)'),
      nameServer: z.string().optional().describe('Nameserver to query (DNS)')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.auth.accountEmail
    });

    let data: Record<string, any> = {};

    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.hostname !== undefined) data.host = ctx.input.hostname;
    if (ctx.input.resolution !== undefined) data.resolution = ctx.input.resolution;
    if (ctx.input.paused !== undefined) data.paused = ctx.input.paused;
    if (ctx.input.tags !== undefined) data.tags = ctx.input.tags;
    if (ctx.input.ipv6 !== undefined) data.ipv6 = ctx.input.ipv6;
    if (ctx.input.responseTimeThreshold !== undefined)
      data.responsetime_threshold = ctx.input.responseTimeThreshold;
    if (ctx.input.sendNotificationWhenDown !== undefined)
      data.sendnotificationwhendown = ctx.input.sendNotificationWhenDown;
    if (ctx.input.notifyAgainEvery !== undefined)
      data.notifyagainevery = ctx.input.notifyAgainEvery;
    if (ctx.input.notifyWhenBackup !== undefined)
      data.notifywhenbackup = ctx.input.notifyWhenBackup;
    if (ctx.input.customMessage !== undefined) data.custom_message = ctx.input.customMessage;
    if (ctx.input.integrationIds !== undefined)
      data.integrationids = ctx.input.integrationIds.join(',');
    if (ctx.input.userIds !== undefined) data.userids = ctx.input.userIds.join(',');
    if (ctx.input.teamIds !== undefined) data.teamids = ctx.input.teamIds.join(',');
    if (ctx.input.probeFilters !== undefined) data.probe_filters = ctx.input.probeFilters;
    if (ctx.input.url !== undefined) data.url = ctx.input.url;
    if (ctx.input.encryption !== undefined) data.encryption = ctx.input.encryption;
    if (ctx.input.port !== undefined) data.port = ctx.input.port;
    if (ctx.input.username !== undefined) data.auth = ctx.input.username;
    if (ctx.input.password !== undefined) data.pass = ctx.input.password;
    if (ctx.input.shouldContain !== undefined) data.shouldcontain = ctx.input.shouldContain;
    if (ctx.input.shouldNotContain !== undefined)
      data.shouldnotcontain = ctx.input.shouldNotContain;
    if (ctx.input.postData !== undefined) data.postdata = ctx.input.postData;
    if (ctx.input.verifyCertificate !== undefined)
      data.verify_certificate = ctx.input.verifyCertificate;
    if (ctx.input.sslDownDaysBefore !== undefined)
      data.ssl_down_days_before = ctx.input.sslDownDaysBefore;
    if (ctx.input.stringToSend !== undefined) data.stringtosend = ctx.input.stringToSend;
    if (ctx.input.stringToExpect !== undefined) data.stringtoexpect = ctx.input.stringToExpect;
    if (ctx.input.expectedIp !== undefined) data.expectedip = ctx.input.expectedIp;
    if (ctx.input.nameServer !== undefined) data.nameserver = ctx.input.nameServer;

    let result = await client.updateCheck(ctx.input.checkId, data);

    return {
      output: {
        message: result.message || 'Check updated successfully'
      },
      message: `Updated uptime check **${ctx.input.checkId}**.`
    };
  })
  .build();
