import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let scheduleSchema = z.object({
  cron: z.string().optional().describe('Five-field cron expression'),
  text: z.string().optional().describe('Natural language schedule, e.g. every 30 minutes'),
  timezone: z.string().optional().describe('IANA timezone, defaults to UTC')
});

let monitorTargetSchema = z.object({
  id: z.string().optional().describe('Optional stable target ID'),
  type: z.enum(['scrape', 'crawl']).describe('Monitor target type'),
  urls: z.array(z.string()).optional().describe('URLs for scrape targets'),
  url: z.string().optional().describe('Base URL for crawl targets'),
  crawlOptions: z
    .record(z.string(), z.any())
    .optional()
    .describe('Crawl options for crawl targets'),
  scrapeOptions: z
    .record(z.string(), z.any())
    .optional()
    .describe('Scrape options for target pages')
});

let monitorWebhookSchema = z.object({
  url: z.string().describe('Webhook URL for monitor events'),
  headers: z.record(z.string(), z.string()).optional().describe('Webhook headers'),
  metadata: z.record(z.string(), z.any()).optional().describe('Webhook metadata'),
  events: z
    .array(z.enum(['monitor.page', 'monitor.check.completed']))
    .optional()
    .describe('Monitor webhook events to receive')
});

let monitorNotificationSchema = z.object({
  email: z
    .object({
      enabled: z.boolean().optional().describe('Enable email notifications'),
      recipients: z.array(z.string()).optional().describe('Email notification recipients'),
      includeDiffs: z.boolean().optional().describe('Include changed page details')
    })
    .optional()
});

let monitorOutputSchema = z.object({
  monitorId: z.string().optional().describe('Firecrawl monitor ID'),
  name: z.string().optional().describe('Monitor name'),
  status: z.string().optional().describe('Monitor status'),
  monitor: z.record(z.string(), z.any()).optional().describe('Full monitor object')
});

let monitorOutput = (value: any) => {
  let monitor = value?.data ?? value?.monitor ?? value;

  return {
    monitorId: monitor?.id,
    name: monitor?.name,
    status: monitor?.status,
    monitor
  };
};

let monitorPayloadShape = {
  name: z.string().optional().describe('Monitor name'),
  schedule: scheduleSchema.optional().describe('Monitor schedule'),
  targets: z.array(monitorTargetSchema).optional().describe('Monitor targets'),
  webhook: monitorWebhookSchema.optional().describe('Webhook notification target'),
  notification: monitorNotificationSchema.optional().describe('Email notification config'),
  retentionDays: z.number().optional().describe('Monitor result retention in days'),
  goal: z.string().nullable().optional().describe('Plain-language monitoring goal'),
  judgeEnabled: z.boolean().optional().describe('Judge changed pages against the goal')
};

export let createMonitorTool = SlateTool.create(spec, {
  name: 'Create Monitor',
  key: 'create_monitor',
  description: `Create a Firecrawl monitor for scheduled scrape or crawl checks with webhook or email notifications.`,
  instructions: [
    'Provide a name, schedule, and at least one target.',
    'Targets can be type scrape with urls or type crawl with url.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      ...monitorPayloadShape,
      name: z.string().describe('Monitor name'),
      schedule: scheduleSchema.describe('Monitor schedule'),
      targets: z.array(monitorTargetSchema).describe('Monitor targets')
    })
  )
  .output(monitorOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createMonitor(ctx.input);

    return {
      output: monitorOutput(result),
      message: `Created Firecrawl monitor **${ctx.input.name}**.`
    };
  });

export let listMonitorsTool = SlateTool.create(spec, {
  name: 'List Monitors',
  key: 'list_monitors',
  description: `List Firecrawl monitors for the authenticated team.`,
  instructions: ['Use limit and offset for pagination.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Number of monitors to return'),
      offset: z.number().optional().describe('Number of monitors to skip')
    })
  )
  .output(
    z.object({
      monitors: z.array(monitorOutputSchema).describe('Firecrawl monitors')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listMonitors({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });
    let monitors = (Array.isArray(result.data) ? result.data : []).map(monitorOutput);

    return {
      output: {
        monitors
      },
      message: `Retrieved **${monitors.length}** Firecrawl monitor(s).`
    };
  });

export let getMonitorTool = SlateTool.create(spec, {
  name: 'Get Monitor',
  key: 'get_monitor',
  description: `Get a Firecrawl monitor by ID.`,
  instructions: ['Provide the monitorId returned by Create Monitor or List Monitors.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      monitorId: z.string().describe('Firecrawl monitor ID')
    })
  )
  .output(monitorOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getMonitor(ctx.input.monitorId);

    return {
      output: monitorOutput(result),
      message: `Retrieved Firecrawl monitor \`${ctx.input.monitorId}\`.`
    };
  });

export let updateMonitorTool = SlateTool.create(spec, {
  name: 'Update Monitor',
  key: 'update_monitor',
  description: `Update a Firecrawl monitor's schedule, targets, notifications, goal, retention, or status.`,
  instructions: ['Provide monitorId and at least one field to update.'],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      monitorId: z.string().describe('Firecrawl monitor ID'),
      ...monitorPayloadShape,
      status: z.enum(['active', 'paused']).optional().describe('Monitor status')
    })
  )
  .output(monitorOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { monitorId, ...updates } = ctx.input;
    let result = await client.updateMonitor(monitorId, updates);

    return {
      output: monitorOutput(result),
      message: `Updated Firecrawl monitor \`${monitorId}\`.`
    };
  });

export let deleteMonitorTool = SlateTool.create(spec, {
  name: 'Delete Monitor',
  key: 'delete_monitor',
  description: `Delete a Firecrawl monitor.`,
  instructions: ['Provide the monitorId to delete.'],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      monitorId: z.string().describe('Firecrawl monitor ID')
    })
  )
  .output(
    z.object({
      success: z.boolean().optional().describe('Whether Firecrawl deleted the monitor')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteMonitor(ctx.input.monitorId);

    return {
      output: {
        success: result.success
      },
      message: `Deleted Firecrawl monitor \`${ctx.input.monitorId}\`.`
    };
  });

export let runMonitorTool = SlateTool.create(spec, {
  name: 'Run Monitor',
  key: 'run_monitor',
  description: `Queue a manual Firecrawl monitor check.`,
  instructions: ['Provide the monitorId to run.'],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      monitorId: z.string().describe('Firecrawl monitor ID')
    })
  )
  .output(
    z.object({
      checkId: z.string().optional().describe('Queued monitor check ID'),
      check: z.record(z.string(), z.any()).optional().describe('Monitor check object'),
      success: z.boolean().optional().describe('Whether Firecrawl queued the check')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.runMonitor(ctx.input.monitorId);
    let check = result.data ?? result.check;

    return {
      output: {
        checkId: result.id ?? check?.id,
        check,
        success: result.success
      },
      message: `Queued monitor check for \`${ctx.input.monitorId}\`.`
    };
  });

export let listMonitorChecksTool = SlateTool.create(spec, {
  name: 'List Monitor Checks',
  key: 'list_monitor_checks',
  description: `List checks for a Firecrawl monitor.`,
  instructions: ['Provide monitorId and optional pagination/status filters.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      monitorId: z.string().describe('Firecrawl monitor ID'),
      limit: z.number().optional().describe('Number of checks to return'),
      offset: z.number().optional().describe('Number of checks to skip'),
      status: z
        .enum(['queued', 'running', 'completed', 'failed', 'partial', 'skipped_overlap'])
        .optional()
        .describe('Check status filter')
    })
  )
  .output(
    z.object({
      checks: z.array(z.record(z.string(), z.any())).describe('Monitor checks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listMonitorChecks(ctx.input.monitorId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      status: ctx.input.status
    });
    let checks = Array.isArray(result.data) ? result.data : [];

    return {
      output: {
        checks
      },
      message: `Retrieved **${checks.length}** check(s) for monitor \`${ctx.input.monitorId}\`.`
    };
  });

export let getMonitorCheckTool = SlateTool.create(spec, {
  name: 'Get Monitor Check',
  key: 'get_monitor_check',
  description: `Get a Firecrawl monitor check and page results.`,
  instructions: [
    'Provide monitorId and checkId. Use limit, skip, and status for page results.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      monitorId: z.string().describe('Firecrawl monitor ID'),
      checkId: z.string().describe('Firecrawl monitor check ID'),
      limit: z.number().optional().describe('Number of page results to return'),
      skip: z.number().optional().describe('Number of page results to skip'),
      status: z
        .enum(['same', 'new', 'changed', 'removed', 'error'])
        .optional()
        .describe('Page result status filter')
    })
  )
  .output(
    z.object({
      check: z.record(z.string(), z.any()).optional().describe('Monitor check detail'),
      pages: z.array(z.record(z.string(), z.any())).optional().describe('Monitor pages'),
      nextUrl: z.string().optional().describe('Next page URL when available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getMonitorCheck(ctx.input.monitorId, ctx.input.checkId, {
      limit: ctx.input.limit,
      skip: ctx.input.skip,
      status: ctx.input.status
    });
    let check = result.data ?? result.check;

    return {
      output: {
        check,
        pages: check?.pages,
        nextUrl: result.next ?? check?.next
      },
      message: `Retrieved monitor check \`${ctx.input.checkId}\`.`
    };
  });
