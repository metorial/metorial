import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

// ── Create Event Dump ──

export let createEventDump = SlateTool.create(spec, {
  name: 'Create Event Dump',
  key: 'create_event_dump',
  description: `Request a historical event data export for a given time period. The dump is generated asynchronously; use **Get Event Dump** to check its status and retrieve the download URL. Events can be filtered by job ID, status, recipient, sender, domain, or campaign.`,
  constraints: [
    'Data is stored for up to 45 days depending on your plan.',
    'Maximum 10 dump files can exist at a time; each is kept for 8 hours.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      startTime: z.string().describe('Start of the time period (ISO 8601 format)'),
      endTime: z.string().describe('End of the time period (ISO 8601 format)'),
      limit: z.number().optional().describe('Maximum number of records to export'),
      allEvents: z.boolean().optional().describe('Include all event types'),
      filterJobId: z.string().optional().describe('Filter by job ID'),
      filterStatus: z.string().optional().describe('Filter by email status'),
      filterDeliveryStatus: z.string().optional().describe('Filter by delivery status'),
      filterEmail: z.string().optional().describe('Filter by recipient email'),
      filterSender: z.string().optional().describe('Filter by sender email'),
      filterDomain: z.string().optional().describe('Filter by domain'),
      filterCampaignId: z.string().optional().describe('Filter by campaign ID')
    })
  )
  .output(
    z.object({
      dumpId: z.number().describe('ID of the created dump request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    let filter: Record<string, string> = {};
    if (ctx.input.filterJobId) filter.job_id = ctx.input.filterJobId;
    if (ctx.input.filterStatus) filter.status = ctx.input.filterStatus;
    if (ctx.input.filterDeliveryStatus)
      filter.delivery_status = ctx.input.filterDeliveryStatus;
    if (ctx.input.filterEmail) filter.email = ctx.input.filterEmail;
    if (ctx.input.filterSender) filter.sender = ctx.input.filterSender;
    if (ctx.input.filterDomain) filter.domain = ctx.input.filterDomain;
    if (ctx.input.filterCampaignId) filter.campaign_id = ctx.input.filterCampaignId;

    let result = await client.createEventDump({
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime,
      limit: ctx.input.limit,
      allEvents: ctx.input.allEvents,
      filter: Object.keys(filter).length > 0 ? filter : undefined
    });

    return {
      output: { dumpId: result.dump_id },
      message: `Event dump created with ID **${result.dump_id}**. Use "Get Event Dump" to check its status.`
    };
  })
  .build();

// ── Get Event Dump ──

export let getEventDump = SlateTool.create(spec, {
  name: 'Get Event Dump',
  key: 'get_event_dump',
  description: `Check the status of an event dump and retrieve its download URL once ready.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dumpId: z.number().describe('ID of the event dump to check')
    })
  )
  .output(
    z.object({
      dumpId: z.number().describe('Dump ID'),
      dumpStatus: z.string().describe('Current status of the dump (e.g., processing, ready)'),
      downloadUrl: z
        .string()
        .optional()
        .describe('URL to download the dump file (available when ready)'),
      files: z.array(z.string()).optional().describe('List of dump file URLs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    let result = await client.getEventDump(ctx.input.dumpId);

    return {
      output: {
        dumpId: result.dump_id,
        dumpStatus: result.dump_status,
        downloadUrl: result.url,
        files: result.files
      },
      message: `Event dump **${result.dump_id}**: status is **${result.dump_status}**.${result.url ? ` Download: ${result.url}` : ''}`
    };
  })
  .build();

// ── List Event Dumps ──

export let listEventDumps = SlateTool.create(spec, {
  name: 'List Event Dumps',
  key: 'list_event_dumps',
  description: `List all existing event dump requests with their statuses and download URLs.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      dumps: z
        .array(
          z.object({
            dumpId: z.number().describe('Dump ID'),
            dumpStatus: z.string().describe('Current dump status'),
            downloadUrl: z.string().optional().describe('Download URL'),
            created: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of event dumps')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    let result = await client.listEventDumps();

    let dumps = (result.list ?? []).map(d => ({
      dumpId: d.dump_id,
      dumpStatus: d.dump_status,
      downloadUrl: d.url,
      created: d.created
    }));

    return {
      output: { dumps },
      message: `Found **${dumps.length}** event dump(s).`
    };
  })
  .build();

// ── Delete Event Dump ──

export let deleteEventDump = SlateTool.create(spec, {
  name: 'Delete Event Dump',
  key: 'delete_event_dump',
  description: `Delete an event dump by its ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      dumpId: z.number().describe('ID of the event dump to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the dump was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    let result = await client.deleteEventDump(ctx.input.dumpId);

    return {
      output: { success: result.status === 'success' },
      message: `Event dump **${ctx.input.dumpId}** deleted.`
    };
  })
  .build();
