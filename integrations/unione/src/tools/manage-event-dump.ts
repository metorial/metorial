import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let resolveDumpReference = (input: { dumpId?: number; dumpReference?: string }) => {
  if (input.dumpReference !== undefined) {
    if (!input.dumpReference.trim()) {
      throw createApiServiceError(
        'Provide a nonempty dumpReference returned by create_event_dump or list_event_dumps.'
      );
    }
    if (input.dumpId !== undefined && String(input.dumpId) !== input.dumpReference) {
      throw createApiServiceError(
        'Provide one event dump identifier, or matching dumpId and dumpReference values.'
      );
    }
    return input.dumpReference;
  }
  if (input.dumpId === undefined) {
    throw createApiServiceError(
      'Provide dumpReference returned by create_event_dump or list_event_dumps, or a legacy numeric dumpId.'
    );
  }
  return String(input.dumpId);
};

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
      dumpId: z
        .number()
        .optional()
        .describe('Legacy numeric ID, when returned by the provider'),
      dumpReference: z
        .string()
        .optional()
        .describe('Provider dump identifier for get_event_dump or delete_event_dump')
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
    if (ctx.input.filterSender) filter.email_from = ctx.input.filterSender;
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
      output: {
        dumpId: typeof result.dump_id === 'number' ? result.dump_id : undefined,
        dumpReference: typeof result.dump_id === 'string' ? result.dump_id : undefined
      },
      message: `Event dump created with ID **${result.dump_id}**. Use "Get Event Dump" to check its status.`
    };
  })
  .build();

// ── Get Event Dump ──

export let getEventDump = SlateTool.create(spec, {
  name: 'Get Event Dump',
  key: 'get_event_dump',
  description: `Check an event dump and download available CSV files, including files completed while the export is still processing. Use dumpReference returned by create_event_dump or list_event_dumps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dumpId: z.number().optional().describe('Legacy numeric event dump ID'),
      dumpReference: z
        .string()
        .optional()
        .describe(
          'Provider dump identifier from create_event_dump or list_event_dumps; supply this or dumpId'
        )
    })
  )
  .output(
    z.object({
      dumpId: z.number().optional().describe('Legacy numeric dump ID, when returned'),
      dumpReference: z.string().optional().describe('Provider dump identifier'),
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

    let result = await client.getEventDump(resolveDumpReference(ctx.input));

    for (let url of new Set([...(result.files ?? []), ...(result.url ? [result.url] : [])])) {
      await ctx.addAttachment({
        type: 'url',
        url,
        mimeType: url.split(/[?#]/)[0]?.endsWith('.gz') ? 'application/gzip' : 'text/csv'
      });
    }

    return {
      output: {
        dumpId: typeof result.dump_id === 'number' ? result.dump_id : undefined,
        dumpReference: typeof result.dump_id === 'string' ? result.dump_id : undefined,
        dumpStatus: result.dump_status,
        downloadUrl: result.url ?? result.files?.[0],
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
            dumpId: z.number().optional().describe('Legacy numeric dump ID, when returned'),
            dumpReference: z.string().optional().describe('Provider dump identifier'),
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
      dumpId: typeof d.dump_id === 'number' ? d.dump_id : undefined,
      dumpReference: typeof d.dump_id === 'string' ? d.dump_id : undefined,
      dumpStatus: d.dump_status,
      downloadUrl: d.url ?? d.files?.[0],
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
  description: `Delete an event dump by dumpReference from create_event_dump or list_event_dumps, or by a legacy numeric dumpId.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      dumpId: z.number().optional().describe('Legacy numeric event dump ID'),
      dumpReference: z
        .string()
        .optional()
        .describe(
          'Provider dump identifier from create_event_dump or list_event_dumps; supply this or dumpId'
        )
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

    let dumpReference = resolveDumpReference(ctx.input);
    let result = await client.deleteEventDump(dumpReference);

    return {
      output: { success: result.status === 'success' },
      message: `Event dump **${dumpReference}** deleted.`
    };
  })
  .build();
