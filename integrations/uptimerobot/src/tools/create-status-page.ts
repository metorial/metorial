import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { invalidInput, positiveId } from '../lib/types';
import { spec } from '../spec';

export let createStatusPage = SlateTool.create(spec, {
  name: 'Create Status Page',
  key: 'create_status_page',
  description: `Use a Legacy API Key connection (API v2). Create a new public status page that displays the uptime status of selected monitors. Configure sort order, custom domain, and password protection.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      friendlyName: z.string().describe('Display name for the status page'),
      includeAllMonitors: z
        .boolean()
        .optional()
        .describe('Include all monitors (default false). If false, provide monitorIds.'),
      monitorIds: z
        .array(z.number())
        .optional()
        .describe('Monitor IDs to include on the status page'),
      sort: z
        .enum(['name_asc', 'name_desc', 'status_up_first', 'status_down_first'])
        .optional()
        .describe('Sort order for monitors on the page'),
      customDomain: z
        .string()
        .optional()
        .describe('Custom domain URL (e.g. "status.example.com")'),
      password: z.string().optional().describe('Password to protect the status page'),
      active: z
        .boolean()
        .optional()
        .describe('Whether the status page is active (default true)')
    })
  )
  .output(
    z.object({
      statusPageId: z.number().describe('ID of the newly created status page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let sortMap: Record<string, number> = {
      name_asc: 1,
      name_desc: 2,
      status_up_first: 3,
      status_down_first: 4
    };

    if (ctx.input.includeAllMonitors && ctx.input.monitorIds?.length)
      invalidInput('Choose includeAllMonitors or monitorIds, not both.');
    if (!ctx.input.includeAllMonitors && !ctx.input.monitorIds?.length)
      invalidInput('Provide monitorIds, or explicitly set includeAllMonitors to true.');
    for (let id of ctx.input.monitorIds ?? []) positiveId(id, 'monitorId');
    let type = ctx.input.includeAllMonitors ? 1 : 2;
    let monitors = ctx.input.includeAllMonitors ? '0' : ctx.input.monitorIds!.join('-');

    let result = await client.newPSP({
      friendlyName: ctx.input.friendlyName,
      type,
      monitors,
      ...(ctx.input.sort && { sort: sortMap[ctx.input.sort] }),
      ...(ctx.input.customDomain && { customDomain: ctx.input.customDomain }),
      ...(ctx.input.password && { password: ctx.input.password }),
      ...(ctx.input.active !== undefined && { status: ctx.input.active ? 1 : 0 })
    });

    return {
      output: {
        statusPageId: result.id
      },
      message: `Created status page "${ctx.input.friendlyName}" (ID: ${result.id}).`
    };
  })
  .build();
