import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newLogs = SlateTrigger.create(spec, {
  name: 'New Logs',
  key: 'new_logs',
  description:
    'Triggers when new LLM call logs are created. Polls for recently added logs across all files. Store the fileId to monitor in the initial state.'
})
  .input(
    z.object({
      logId: z.string().describe('ID of the log'),
      fileId: z.string().describe('File ID the log belongs to'),
      versionId: z.string().optional().describe('Version ID of the log'),
      createdAt: z.string().optional().describe('Timestamp when the log was created'),
      logType: z
        .string()
        .optional()
        .describe('Type of the log (prompt, tool, flow, evaluator)'),
      output: z.string().optional().describe('Output text of the log'),
      inputValues: z.record(z.string(), z.any()).optional().describe('Input values used'),
      tokenCount: z.number().optional().describe('Total token count'),
      latencyMs: z.number().optional().describe('Latency in milliseconds')
    })
  )
  .output(
    z.object({
      logId: z.string().describe('ID of the log'),
      fileId: z.string().describe('File ID the log belongs to'),
      versionId: z.string().optional().describe('Version ID of the log'),
      createdAt: z.string().optional().describe('Timestamp when the log was created'),
      logType: z.string().optional().describe('Type of the log'),
      output: z.string().optional().describe('Output text'),
      inputValues: z.record(z.string(), z.any()).optional().describe('Input variables'),
      tokenCount: z.number().optional().describe('Total token count'),
      latencyMs: z.number().optional().describe('Latency in milliseconds')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let fileId = ctx.state?.fileId as string | undefined;
      if (!fileId) {
        return { inputs: [], updatedState: ctx.state || {} };
      }

      let lastSeenAt = ctx.state?.lastSeenAt as string | undefined;
      let lastSeenIds = (ctx.state?.lastSeenIds as string[] | undefined) || [];

      let params: {
        page?: number;
        size?: number;
        startDate?: string;
      } = {
        page: 1,
        size: 50
      };

      if (lastSeenAt) {
        params.startDate = lastSeenAt;
      }

      let result = await client.listLogs(fileId, params);
      let records = result.records || [];

      let newRecords =
        lastSeenIds.length > 0
          ? records.filter((r: any) => !lastSeenIds.includes(r.id))
          : records;

      let newLastSeenAt = lastSeenAt;
      let newLastSeenIds: string[] = [];

      if (records.length > 0) {
        let mostRecentRecord = records[0];
        newLastSeenAt =
          mostRecentRecord.created_at || mostRecentRecord.updated_at || lastSeenAt;
        newLastSeenIds = records.map((r: any) => r.id).slice(0, 100);
      }

      return {
        inputs: newRecords.map((record: any) => ({
          logId: record.id,
          fileId,
          versionId: record.version_id,
          createdAt: record.created_at,
          logType: record.log_type || record.type,
          output: record.output_message?.content || record.output,
          inputValues: record.inputs,
          tokenCount: record.usage
            ? (record.usage.prompt_tokens || 0) + (record.usage.completion_tokens || 0)
            : undefined,
          latencyMs: record.provider_latency ? record.provider_latency * 1000 : undefined
        })),
        updatedState: {
          fileId,
          lastSeenAt: newLastSeenAt || new Date().toISOString(),
          lastSeenIds: newLastSeenIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'log.created',
        id: ctx.input.logId,
        output: {
          logId: ctx.input.logId,
          fileId: ctx.input.fileId,
          versionId: ctx.input.versionId,
          createdAt: ctx.input.createdAt,
          logType: ctx.input.logType,
          output: ctx.input.output,
          inputValues: ctx.input.inputValues,
          tokenCount: ctx.input.tokenCount,
          latencyMs: ctx.input.latencyMs
        }
      };
    }
  })
  .build();
