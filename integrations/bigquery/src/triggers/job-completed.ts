import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { BigQueryClient } from '../lib/client';
import { spec } from '../spec';

export let jobCompleted = SlateTrigger.create(spec, {
  name: 'Job Completed',
  key: 'job_completed',
  description:
    'Triggers when a BigQuery job (query, load, extract, or copy) completes, either successfully or with errors.'
})
  .input(
    z.object({
      jobId: z.string(),
      projectId: z.string(),
      state: z.string(),
      jobType: z.string().optional(),
      errorResult: z.any().optional(),
      configuration: z.any().optional(),
      statistics: z.any().optional(),
      userEmail: z.string().optional(),
      creationTime: z.string().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional()
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('BigQuery job ID'),
      projectId: z.string().describe('Project ID'),
      jobType: z.string().optional().describe('Type of job (query, load, extract, copy)'),
      state: z.string().describe('Final state of the job'),
      succeeded: z.boolean().describe('Whether the job completed without errors'),
      errorMessage: z.string().optional().describe('Error message if the job failed'),
      userEmail: z.string().optional().describe('Email of the user who created the job'),
      creationTime: z.string().optional().describe('Job creation time'),
      startTime: z.string().optional().describe('Job start time'),
      endTime: z.string().optional().describe('Job completion time'),
      totalBytesProcessed: z.string().optional().describe('Total bytes processed'),
      query: z.string().optional().describe('SQL query text (for query jobs)'),
      destinationTable: z.string().optional().describe('Destination table reference'),
      sourceUris: z.array(z.string()).optional().describe('Source URIs (for load jobs)'),
      destinationUris: z
        .array(z.string())
        .optional()
        .describe('Destination URIs (for export jobs)')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new BigQueryClient({
        token: ctx.auth.token,
        projectId: ctx.config.projectId,
        location: ctx.config.location
      });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let now = Date.now().toString();

      let params: any = {
        stateFilter: 'done',
        maxResults: 50,
        projection: 'full'
      };

      if (lastPollTime) {
        params.minCreationTime = lastPollTime;
      }

      let result = await client.listJobs(params);
      let jobs = result.jobs || [];

      let seenJobIds = (ctx.state?.seenJobIds || []) as string[];

      let newJobs = jobs.filter((j: any) => {
        let jid = j.jobReference?.jobId;
        return jid && !seenJobIds.includes(jid);
      });

      let newSeenIds = newJobs.map((j: any) => j.jobReference.jobId);
      let updatedSeenIds = [...seenJobIds, ...newSeenIds].slice(-200);

      let inputs = newJobs.map((j: any) => {
        let config = j.configuration || {};
        let jobType = config.query
          ? 'query'
          : config.load
            ? 'load'
            : config.extract
              ? 'extract'
              : config.copy
                ? 'copy'
                : undefined;

        return {
          jobId: j.jobReference.jobId,
          projectId: j.jobReference.projectId,
          state: j.status?.state || 'DONE',
          jobType,
          errorResult: j.status?.errorResult,
          configuration: j.configuration,
          statistics: j.statistics,
          userEmail: j.user_email,
          creationTime: j.statistics?.creationTime,
          startTime: j.statistics?.startTime,
          endTime: j.statistics?.endTime
        };
      });

      return {
        inputs,
        updatedState: {
          lastPollTime: now,
          seenJobIds: updatedSeenIds
        }
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;
      let config = input.configuration || {};
      let stats = input.statistics || {};
      let succeeded = !input.errorResult;

      let query: string | undefined;
      let destinationTable: string | undefined;
      let sourceUris: string[] | undefined;
      let destinationUris: string[] | undefined;
      let totalBytesProcessed: string | undefined;

      if (config.query) {
        query = config.query.query;
        totalBytesProcessed = stats.query?.totalBytesProcessed || stats.totalBytesProcessed;
        if (config.query.destinationTable) {
          let dt = config.query.destinationTable;
          destinationTable = `${dt.projectId}.${dt.datasetId}.${dt.tableId}`;
        }
      }

      if (config.load) {
        sourceUris = config.load.sourceUris;
        if (config.load.destinationTable) {
          let dt = config.load.destinationTable;
          destinationTable = `${dt.projectId}.${dt.datasetId}.${dt.tableId}`;
        }
        totalBytesProcessed = stats.load?.outputBytes;
      }

      if (config.extract) {
        destinationUris = config.extract.destinationUris;
        if (config.extract.sourceTable) {
          let st = config.extract.sourceTable;
          destinationTable = `${st.projectId}.${st.datasetId}.${st.tableId}`;
        }
      }

      if (config.copy) {
        if (config.copy.destinationTable) {
          let dt = config.copy.destinationTable;
          destinationTable = `${dt.projectId}.${dt.datasetId}.${dt.tableId}`;
        }
      }

      let eventType = succeeded
        ? `job.${input.jobType || 'unknown'}.succeeded`
        : `job.${input.jobType || 'unknown'}.failed`;

      return {
        type: eventType,
        id: input.jobId,
        output: {
          jobId: input.jobId,
          projectId: input.projectId,
          jobType: input.jobType,
          state: input.state,
          succeeded,
          errorMessage: input.errorResult?.message,
          userEmail: input.userEmail,
          creationTime: input.creationTime,
          startTime: input.startTime,
          endTime: input.endTime,
          totalBytesProcessed,
          query,
          destinationTable,
          sourceUris,
          destinationUris
        }
      };
    }
  })
  .build();
