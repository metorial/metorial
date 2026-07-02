import { SlateTool } from 'slates';
import { z } from 'zod';
import { StitchConnectClient } from '../lib/client';
import { spec } from '../spec';

export let startReplication = SlateTool.create(spec, {
  name: 'Start Replication',
  key: 'start_replication',
  description: `Initiates a replication (sync) job for a data source. This triggers Stitch to extract data from the source and load it into the destination. The source must be fully configured before starting replication.`,
  tags: {
    destructive: false
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
      region: ctx.config.region,
      clientId: ctx.config.clientId
    });

    let result = await client.startReplication(ctx.input.sourceId);

    return {
      output: {
        requestId: result?.request_id || result?.job_name || null,
        status: result?.status || 'started'
      },
      message: `Started replication for source **${ctx.input.sourceId}**.`
    };
  })
  .build();

export let stopReplication = SlateTool.create(spec, {
  name: 'Stop Replication',
  key: 'stop_replication',
  description: `Stops an active replication (sync) job for a data source. Use this to cancel an in-progress extraction.`,
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
      region: ctx.config.region,
      clientId: ctx.config.clientId
    });

    let result = await client.stopReplication(ctx.input.sourceId);

    return {
      output: {
        success: true,
        status: result?.status || 'stopped'
      },
      message: `Stopped replication for source **${ctx.input.sourceId}**.`
    };
  })
  .build();

export let listExtractions = SlateTool.create(spec, {
  name: 'List Extractions',
  key: 'list_extractions',
  description: `Lists recent extraction jobs for the Stitch account. Shows the status, timing, and details of data extraction operations. Requires the Stitch client ID to be set in configuration.`,
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
      extractions: z.array(z.any()).describe('List of extraction job records'),
      page: z.number().nullable().describe('Current page number'),
      total: z.number().nullable().describe('Total number of extraction records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StitchConnectClient({
      token: ctx.auth.token,
      region: ctx.config.region,
      clientId: ctx.config.clientId
    });

    let result = await client.listExtractions(ctx.input.page);
    let extractions =
      result?.data || result?.extractions || (Array.isArray(result) ? result : []);

    return {
      output: {
        extractions,
        page: result?.page ?? null,
        total: result?.total ?? null
      },
      message: `Retrieved **${extractions.length}** extraction record(s).`
    };
  })
  .build();

export let listLoads = SlateTool.create(spec, {
  name: 'List Loads',
  key: 'list_loads',
  description: `Lists recent data load operations for the Stitch account. Shows loading status, row counts, and timing for data being written to the destination warehouse. Requires the Stitch client ID to be set in configuration.`,
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
      loads: z.array(z.any()).describe('List of load operation records'),
      page: z.number().nullable().describe('Current page number'),
      total: z.number().nullable().describe('Total number of load records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StitchConnectClient({
      token: ctx.auth.token,
      region: ctx.config.region,
      clientId: ctx.config.clientId
    });

    let result = await client.listLoads(ctx.input.page);
    let loads = result?.data || result?.loads || (Array.isArray(result) ? result : []);

    return {
      output: {
        loads,
        page: result?.page ?? null,
        total: result?.total ?? null
      },
      message: `Retrieved **${loads.length}** load record(s).`
    };
  })
  .build();

export let getExtractionLogs = SlateTool.create(spec, {
  name: 'Get Extraction Logs',
  key: 'get_extraction_logs',
  description: `Retrieves detailed logs for a specific extraction job. Use this to debug extraction failures or monitor extraction progress. Requires the Stitch client ID to be set in configuration.`,
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
      logs: z.any().describe('Extraction job logs and details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StitchConnectClient({
      token: ctx.auth.token,
      region: ctx.config.region,
      clientId: ctx.config.clientId
    });

    let logs = await client.getExtractionLogs(ctx.input.jobName);

    return {
      output: { logs },
      message: `Retrieved logs for extraction job **${ctx.input.jobName}**.`
    };
  })
  .build();
