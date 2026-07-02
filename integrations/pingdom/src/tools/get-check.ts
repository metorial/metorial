import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCheck = SlateTool.create(spec, {
  name: 'Get Uptime Check',
  key: 'get_check',
  description: `Retrieves detailed information about a specific uptime check, including its full configuration, type-specific settings (HTTP headers, encryption, port, etc.), and current status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      checkId: z.number().describe('ID of the uptime check to retrieve')
    })
  )
  .output(
    z.object({
      checkId: z.number().describe('Unique check identifier'),
      name: z.string().describe('Check name'),
      hostname: z.string().optional().describe('Target hostname'),
      status: z.string().optional().describe('Current status'),
      type: z
        .object({
          name: z.string().optional().describe('Check type name'),
          http: z
            .object({
              url: z.string().optional(),
              encryption: z.boolean().optional(),
              port: z.number().optional(),
              username: z.string().optional(),
              shouldContain: z.string().optional(),
              shouldNotContain: z.string().optional(),
              postData: z.string().optional(),
              requestHeaders: z.record(z.string(), z.string()).optional(),
              verifyCertificate: z.boolean().optional(),
              sslDownDaysBefore: z.number().optional()
            })
            .optional()
            .describe('HTTP-specific settings'),
          tcp: z
            .object({
              port: z.number().optional(),
              stringToSend: z.string().optional(),
              stringToExpect: z.string().optional()
            })
            .optional()
            .describe('TCP-specific settings'),
          dns: z
            .object({
              expectedIp: z.string().optional(),
              nameServer: z.string().optional()
            })
            .optional()
            .describe('DNS-specific settings')
        })
        .optional()
        .describe('Check type details'),
      resolution: z.number().optional().describe('Check interval in minutes'),
      sendNotificationWhenDown: z.number().optional(),
      notifyAgainEvery: z.number().optional(),
      notifyWhenBackup: z.boolean().optional(),
      created: z.number().optional().describe('Creation timestamp (Unix)'),
      lastErrorTime: z.number().optional(),
      lastTestTime: z.number().optional(),
      lastResponseTime: z.number().optional(),
      paused: z.boolean().optional(),
      ipv6: z.boolean().optional(),
      responseTimeThreshold: z.number().optional(),
      customMessage: z.string().optional(),
      integrationIds: z.array(z.number()).optional(),
      userIds: z.array(z.number()).optional(),
      teamIds: z.array(z.number()).optional(),
      tags: z
        .array(
          z.object({
            name: z.string(),
            type: z.string().optional(),
            count: z.any().optional()
          })
        )
        .optional(),
      probeFilters: z.array(z.string()).optional(),
      severityLevel: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.auth.accountEmail
    });

    let result = await client.getCheck(ctx.input.checkId, { include_teams: true });
    let c = result.check || result;

    return {
      output: {
        checkId: c.id,
        name: c.name,
        hostname: c.hostname,
        status: c.status,
        type: c.type
          ? {
              name: c.type.name || (typeof c.type === 'string' ? c.type : undefined),
              http: c.type.http
                ? {
                    url: c.type.http.url,
                    encryption: c.type.http.encryption,
                    port: c.type.http.port,
                    username: c.type.http.username,
                    shouldContain: c.type.http.shouldcontain,
                    shouldNotContain: c.type.http.shouldnotcontain,
                    postData: c.type.http.postdata,
                    requestHeaders: c.type.http.requestheaders,
                    verifyCertificate: c.type.http.verify_certificate,
                    sslDownDaysBefore: c.type.http.ssl_down_days_before
                  }
                : undefined,
              tcp: c.type.tcp
                ? {
                    port: c.type.tcp.port,
                    stringToSend: c.type.tcp.stringtosend,
                    stringToExpect: c.type.tcp.stringtoexpect
                  }
                : undefined,
              dns: c.type.dns
                ? {
                    expectedIp: c.type.dns.expectedip,
                    nameServer: c.type.dns.nameserver
                  }
                : undefined
            }
          : undefined,
        resolution: c.resolution,
        sendNotificationWhenDown: c.sendnotificationwhendown,
        notifyAgainEvery: c.notifyagainevery,
        notifyWhenBackup: c.notifywhenbackup,
        created: c.created,
        lastErrorTime: c.lasterrortime,
        lastTestTime: c.lasttesttime,
        lastResponseTime: c.lastresponsetime,
        paused: c.paused,
        ipv6: c.ipv6,
        responseTimeThreshold: c.responsetime_threshold,
        customMessage: c.custom_message,
        integrationIds: c.integrationids,
        userIds: c.userids,
        teamIds: c.teams?.map((t: any) => t.id),
        tags: c.tags,
        probeFilters: c.probe_filters,
        severityLevel: c.severity_level
      },
      message: `Retrieved check **${c.name}** (${c.status || 'unknown'}).`
    };
  })
  .build();
