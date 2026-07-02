import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateMonitor = SlateTool.create(spec, {
  name: 'Update Monitor',
  key: 'update_monitor',
  description: `Update an existing monitor's settings including its name, URL, check interval, timeout, HTTP configuration, alert contacts, and maintenance windows. Can also pause or resume a monitor.`,
  instructions: [
    'Monitor type cannot be changed — delete and recreate the monitor to change its type.',
    'To pause a monitor, set `paused` to true. To resume, set it to false.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      monitorId: z.number().describe('ID of the monitor to update'),
      friendlyName: z.string().optional().describe('New display name'),
      url: z.string().optional().describe('New URL or IP address'),
      paused: z
        .boolean()
        .optional()
        .describe('Set to true to pause or false to resume the monitor'),
      interval: z.number().optional().describe('New check interval in seconds'),
      timeout: z.number().optional().describe('New timeout in seconds (1-60)'),
      keywordValue: z
        .string()
        .optional()
        .describe('New keyword to search for (keyword monitors only)'),
      keywordType: z
        .enum(['exists', 'not_exists'])
        .optional()
        .describe('Whether keyword should exist or not'),
      keywordCaseSensitive: z
        .boolean()
        .optional()
        .describe('Whether keyword matching is case-sensitive'),
      httpMethod: z
        .enum(['head', 'get', 'post', 'put', 'patch', 'delete', 'options'])
        .optional()
        .describe('HTTP method to use'),
      postValue: z.string().optional().describe('Request body data'),
      postContentType: z
        .enum(['text/html', 'application/json'])
        .optional()
        .describe('Content type for request body'),
      httpUsername: z.string().optional().describe('HTTP auth username'),
      httpPassword: z.string().optional().describe('HTTP auth password'),
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
      monitorId: z.number().describe('ID of the updated monitor')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let httpMethodMap: Record<string, number> = {
      head: 1,
      get: 2,
      post: 3,
      put: 4,
      patch: 5,
      delete: 6,
      options: 7
    };

    let result = await client.editMonitor({
      monitorId: ctx.input.monitorId,
      ...(ctx.input.friendlyName !== undefined && { friendlyName: ctx.input.friendlyName }),
      ...(ctx.input.url !== undefined && { url: ctx.input.url }),
      ...(ctx.input.paused !== undefined && { status: ctx.input.paused ? 0 : 1 }),
      ...(ctx.input.interval !== undefined && { interval: ctx.input.interval }),
      ...(ctx.input.timeout !== undefined && { timeout: ctx.input.timeout }),
      ...(ctx.input.keywordValue !== undefined && { keywordValue: ctx.input.keywordValue }),
      ...(ctx.input.keywordType && {
        keywordType: ctx.input.keywordType === 'exists' ? 1 : 2
      }),
      ...(ctx.input.keywordCaseSensitive !== undefined && {
        keywordCaseType: ctx.input.keywordCaseSensitive ? 0 : 1
      }),
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
      ...(ctx.input.customHttpHeaders !== undefined && {
        customHttpHeaders: ctx.input.customHttpHeaders
      }),
      ...(ctx.input.alertContacts !== undefined && { alertContacts: ctx.input.alertContacts }),
      ...(ctx.input.maintenanceWindows !== undefined && {
        mwindows: ctx.input.maintenanceWindows
      }),
      ...(ctx.input.ignoreSslErrors !== undefined && {
        ignoreSslErrors: ctx.input.ignoreSslErrors ? 1 : 0
      })
    });

    return {
      output: {
        monitorId: result.id
      },
      message: `Updated monitor **${ctx.input.monitorId}**${ctx.input.friendlyName ? ` (renamed to "${ctx.input.friendlyName}")` : ''}.`
    };
  })
  .build();
