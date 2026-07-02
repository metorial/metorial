import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createMonitor = SlateTool.create(spec, {
  name: 'Create Monitor',
  key: 'create_monitor',
  description: `Create a new uptime monitor. Supports HTTP(s), Keyword, Ping, Port, and Heartbeat monitor types. Configure check intervals, timeouts, HTTP methods, alert contacts, and maintenance windows.`,
  instructions: [
    'For **Keyword** monitors, provide `keywordValue` and `keywordType`.',
    'For **Port** monitors, provide `portSubType` and optionally `portNumber` (required when portSubType is "custom").',
    'Alert contacts use the format `{contactId}_{threshold}_{recurrence}` separated by dashes, e.g. "457_0_0-373_5_0".'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      friendlyName: z.string().describe('Display name for the monitor'),
      url: z.string().describe('URL or IP address to monitor'),
      type: z.enum(['http', 'keyword', 'ping', 'port', 'heartbeat']).describe('Monitor type'),
      keywordValue: z
        .string()
        .optional()
        .describe('Keyword to search for (required for keyword monitors)'),
      keywordType: z
        .enum(['exists', 'not_exists'])
        .optional()
        .describe('Whether keyword should exist or not exist on the page'),
      keywordCaseSensitive: z
        .boolean()
        .optional()
        .describe('Whether keyword matching is case-sensitive (default true)'),
      portSubType: z
        .enum(['http', 'https', 'ftp', 'smtp', 'pop3', 'imap', 'custom'])
        .optional()
        .describe('Port sub-type (required for port monitors)'),
      portNumber: z
        .number()
        .optional()
        .describe('Custom port number (required when portSubType is "custom")'),
      interval: z.number().optional().describe('Check interval in seconds'),
      timeout: z
        .number()
        .optional()
        .describe('Timeout in seconds (1-60, HTTP/keyword/port only)'),
      httpMethod: z
        .enum(['head', 'get', 'post', 'put', 'patch', 'delete', 'options'])
        .optional()
        .describe('HTTP method to use'),
      postValue: z
        .string()
        .optional()
        .describe('Request body data for POST/PUT/PATCH/DELETE/OPTIONS'),
      postContentType: z
        .enum(['text/html', 'application/json'])
        .optional()
        .describe('Content type for POST body'),
      httpUsername: z.string().optional().describe('HTTP Basic/Digest Auth username'),
      httpPassword: z.string().optional().describe('HTTP Basic/Digest Auth password'),
      httpAuthType: z
        .enum(['basic', 'digest'])
        .optional()
        .describe('HTTP authentication type'),
      customHttpHeaders: z.string().optional().describe('Custom HTTP headers as JSON string'),
      alertContacts: z
        .string()
        .optional()
        .describe(
          'Alert contacts in format "contactId_threshold_recurrence" separated by dashes'
        ),
      maintenanceWindows: z
        .string()
        .optional()
        .describe('Maintenance window IDs separated by dashes'),
      ignoreSslErrors: z.boolean().optional().describe('Ignore SSL certificate errors')
    })
  )
  .output(
    z.object({
      monitorId: z.number().describe('ID of the newly created monitor'),
      status: z.number().describe('Initial status of the monitor')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let typeMap: Record<string, number> = {
      http: 1,
      keyword: 2,
      ping: 3,
      port: 4,
      heartbeat: 5
    };
    let httpMethodMap: Record<string, number> = {
      head: 1,
      get: 2,
      post: 3,
      put: 4,
      patch: 5,
      delete: 6,
      options: 7
    };
    let portSubTypeMap: Record<string, number> = {
      http: 1,
      https: 2,
      ftp: 3,
      smtp: 4,
      pop3: 5,
      imap: 6,
      custom: 99
    };

    let result = await client.newMonitor({
      friendlyName: ctx.input.friendlyName,
      url: ctx.input.url,
      type: typeMap[ctx.input.type]!,
      ...(ctx.input.keywordValue !== undefined && { keywordValue: ctx.input.keywordValue }),
      ...(ctx.input.keywordType && {
        keywordType: ctx.input.keywordType === 'exists' ? 1 : 2
      }),
      ...(ctx.input.keywordCaseSensitive !== undefined && {
        keywordCaseType: ctx.input.keywordCaseSensitive ? 0 : 1
      }),
      ...(ctx.input.portSubType && { subType: portSubTypeMap[ctx.input.portSubType] }),
      ...(ctx.input.portNumber !== undefined && { port: ctx.input.portNumber }),
      ...(ctx.input.interval !== undefined && { interval: ctx.input.interval }),
      ...(ctx.input.timeout !== undefined && { timeout: ctx.input.timeout }),
      ...(ctx.input.httpMethod && { httpMethod: httpMethodMap[ctx.input.httpMethod] }),
      ...(ctx.input.postValue !== undefined && {
        postValue: ctx.input.postValue,
        postType: 2
      }),
      ...(ctx.input.postContentType && {
        postContentType: ctx.input.postContentType === 'application/json' ? 1 : 0
      }),
      ...(ctx.input.httpUsername !== undefined && { httpUsername: ctx.input.httpUsername }),
      ...(ctx.input.httpPassword !== undefined && { httpPassword: ctx.input.httpPassword }),
      ...(ctx.input.httpAuthType && {
        httpAuthType: ctx.input.httpAuthType === 'basic' ? 1 : 2
      }),
      ...(ctx.input.customHttpHeaders && { customHttpHeaders: ctx.input.customHttpHeaders }),
      ...(ctx.input.alertContacts && { alertContacts: ctx.input.alertContacts }),
      ...(ctx.input.maintenanceWindows && { mwindows: ctx.input.maintenanceWindows }),
      ...(ctx.input.ignoreSslErrors !== undefined && {
        ignoreSslErrors: ctx.input.ignoreSslErrors ? 1 : 0
      })
    });

    return {
      output: {
        monitorId: result.id,
        status: result.status
      },
      message: `Created **${ctx.input.type}** monitor "${ctx.input.friendlyName}" (ID: ${result.id}) for \`${ctx.input.url}\`.`
    };
  })
  .build();
