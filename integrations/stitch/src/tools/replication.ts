import { SlateTool } from 'slates';
import { z } from 'zod';
import { resolveRegion, StitchConnectClient } from '../lib/client';
import { spec } from '../spec';

export let startReplication = SlateTool.create(spec, {
  name: 'Start Replication',
  key: 'start_replication',
  description: `Initiates a replication (sync) job for a data source. This triggers Stitch to extract data from the source and load it into the destination. The source must be fully configured before starting replication.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      sourceId: z.number().describe('ID of the source to start replicating')
    })
  )
  .output(
    z.object({
      requestId: z.string().nullable().describe('ID of the replication request'),
      status: z.string().nullable().describe('Status of the replication request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StitchConnectClient({
      token: ctx.auth.token,
      region: resolveRegion(ctx.auth.region, ctx.config),
      clientId: ctx.auth.clientId ?? ctx.config.clientId
    });

    let result = await client.startReplication(ctx.input.sourceId);

    return {
      output: {
        requestId: result.job_name,
        status: null
      },
      message: `Requested replication for source **${ctx.input.sourceId}**.`
    };
  })
  .build();

export let stopReplication = SlateTool.create(spec, {
  name: 'Stop Replication',
  key: 'stop_replication',
  description: `Requests stopping an in-progress extraction for a source. Already extracted data may still be prepared or loaded; this does not erase destination data.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      sourceId: z.number().describe('ID of the source to stop replicating')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the stop request was successful'),
      status: z.string().nullable().describe('Status after stopping')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StitchConnectClient({
      token: ctx.auth.token,
      region: resolveRegion(ctx.auth.region, ctx.config),
      clientId: ctx.auth.clientId ?? ctx.config.clientId
    });

    let result = await client.stopReplication(ctx.input.sourceId);

    return {
      output: {
        success: true,
        status: String(result.status)
      },
      message: `Accepted the stop request for source **${ctx.input.sourceId}**.`
    };
  })
  .build();

export let listExtractions = SlateTool.create(spec, {
  name: 'List Extractions',
  key: 'list_extractions',
  description: `Lists the latest completed extraction per source from the past 60 days, including paused or deleted sources. This does not list active jobs or all historical runs. Uses the account ID discovered when connecting, with configured client ID as a fallback.`,
  constraints: [
    'Rate limited to 30 requests per 10 minutes.',
    'Results are paginated with a maximum of 100 records per page.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      extractions: z.array(z.unknown()).describe('List of extraction job records'),
      page: z.number().nullable().describe('Current page number'),
      total: z.number().nullable().describe('Total number of extraction records'),
      nextPage: z
        .number()
        .nullable()
        .optional()
        .describe('Next page to request; null when the provider has no next link')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StitchConnectClient({
      token: ctx.auth.token,
      region: resolveRegion(ctx.auth.region, ctx.config),
      clientId: ctx.auth.clientId ?? ctx.config.clientId
    });

    let result = await client.listExtractions(ctx.input.page);
    let extractions = result.data;

    return {
      output: {
        extractions,
        page: result?.page ?? null,
        total: result.total,
        nextPage: result.links?.next ? result.page + 1 : null
      },
      message: `Retrieved **${extractions.length}** extraction record(s).`
    };
  })
  .build();

export let listLoads = SlateTool.create(spec, {
  name: 'List Loads',
  key: 'list_loads',
  description: `Lists recent data load operations for the Stitch account. Shows loading status, row counts, and timing for data being written to the destination warehouse. Uses the account ID discovered when connecting, with configured client ID as a fallback.`,
  constraints: [
    'Rate limited to 30 requests per 10 minutes.',
    'Results are paginated with a maximum of 100 records per page.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      loads: z.array(z.unknown()).describe('List of load operation records'),
      page: z.number().nullable().describe('Current page number'),
      total: z.number().nullable().describe('Total number of load records'),
      nextPage: z
        .number()
        .nullable()
        .optional()
        .describe('Next page to request; null when the provider has no next link')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StitchConnectClient({
      token: ctx.auth.token,
      region: resolveRegion(ctx.auth.region, ctx.config),
      clientId: ctx.auth.clientId ?? ctx.config.clientId
    });

    let result = await client.listLoads(ctx.input.page);
    let loads = result.data;

    return {
      output: {
        loads,
        page: result?.page ?? null,
        total: result.total,
        nextPage: result.links?.next ? result.page + 1 : null
      },
      message: `Retrieved **${loads.length}** load record(s).`
    };
  })
  .build();

export let getExtractionLogs = SlateTool.create(spec, {
  name: 'Get Extraction Logs',
  key: 'get_extraction_logs',
  description: `Retrieves detailed logs for a specific extraction job. Use this to debug extraction failures or monitor extraction progress. Uses the account ID discovered when connecting, with configured client ID as a fallback.`,
  constraints: ['Rate limited to 30 requests per 10 minutes.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobName: z.string().describe('Name/ID of the extraction job to get logs for')
    })
  )
  .output(
    z.object({
      logs: z.unknown().describe('Download metadata for the extraction log file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StitchConnectClient({
      token: ctx.auth.token,
      region: resolveRegion(ctx.auth.region, ctx.config),
      clientId: ctx.auth.clientId ?? ctx.config.clientId
    });

    let file = await client.getExtractionLogs(ctx.input.jobName);
    await ctx.addAttachment({
      type: 'url',
      url: file.url,
      mimeType: file.mimeType,
      refreshAt: file.expiresAt,
      refreshReference: {
        jobName: ctx.input.jobName,
        clientId: file.clientId,
        region: resolveRegion(ctx.auth.region, ctx.config)
      }
    });
    return {
      output: { logs: { jobName: ctx.input.jobName, mimeType: file.mimeType } },
      message: `Prepared a downloadable log file for extraction job **${ctx.input.jobName}**.`
    };
  })
  .build();
