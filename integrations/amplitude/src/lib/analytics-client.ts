import { ServiceError } from '@lowerdeck/error';
import { createAxios } from 'slates';
import { z } from 'zod';
import { resolveAmplitudeConfig } from './client';
import {
  DOWNLOAD_LIMIT,
  type DownloadedFile,
  downloadStorageFile,
  receiveFile,
  validateStorageUrl
} from './downloads';
import { amplitudeApiError, amplitudeServiceError } from './errors';
import {
  parseResponse,
  recordSchema,
  serializeGroupBy,
  serializeSegment,
  validateDateRange,
  validateInterval
} from './rest-validation';

export const amplitudeIdSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const replayIdSchema = z
  .string()
  .regex(/^[^/]+\/[^/]+$/, 'Use device_id/session_id format.');
const replayPageSchema = z.object({
  files: z.array(z.string()),
  next_page_token: z.string().nullable()
});
const cohortRequestSchema = z.object({
  request_id: z.string(),
  cohort_id: z.string(),
  async_status: z.string().optional()
});
export type ReplayPageInput = { replayId: string; cursor?: string; limit: number };

export const createAnalyticsClient = (ctx: Parameters<typeof resolveAmplitudeConfig>[0]) => {
  const config = resolveAmplitudeConfig(ctx);
  const ax = createAxios({
    baseURL:
      config.region === 'EU'
        ? 'https://analytics.eu.amplitude.com/api'
        : 'https://amplitude.com/api',
    headers: { Authorization: `Basic ${config.token}` },
    maxRedirects: 0,
    timeout: 30_000
  });
  const get = async (
    path: string,
    params?: URLSearchParams | Record<string, unknown>,
    deadline?: number
  ): Promise<unknown> => {
    const remaining = deadline === undefined ? 30_000 : Math.max(1, deadline - Date.now());
    const signal = AbortSignal.timeout(remaining);
    try {
      const response = await ax.get(path, {
        params,
        timeout: remaining,
        signal
      });
      const data = response.data;
      if (data && typeof data === 'object' && (data.error || data.success === false))
        throw amplitudeApiError({ response });
      return data;
    } catch (error) {
      if (deadline !== undefined && signal.aborted) return undefined;
      throw amplitudeApiError(error);
    }
  };
  const replayPage = async (input: ReplayPageInput) =>
    parseResponse(
      replayPageSchema,
      await get('/1/session-replays/files', {
        replay_id: input.replayId,
        version: 3,
        page_size: input.limit,
        page_token: input.cursor
      }),
      'session replay files'
    );
  return {
    async searchUsers(query: string) {
      return parseResponse(
        z.object({
          matches: z.array(
            z.object({ user_id: z.string().nullish(), amplitude_id: amplitudeIdSchema })
          ),
          type: z.string()
        }),
        await get('/2/usersearch', { user: query }),
        'user search'
      );
    },
    async getUserActivity(input: {
      amplitudeId: number;
      offset: number;
      limit: number;
      direction: string;
    }) {
      return parseResponse(
        z.object({ userData: recordSchema, events: z.array(recordSchema) }),
        await get('/2/useractivity', {
          user: input.amplitudeId,
          offset: input.offset,
          limit: input.limit,
          direction: input.direction
        }),
        'user activity'
      );
    },
    async listSessionReplays(input: {
      startTime?: string;
      endTime?: string;
      amplitudeId?: number;
      replayIds?: string[];
      cursor?: string;
      limit: number;
      sortOrder: string;
    }) {
      if (input.replayIds && (input.amplitudeId !== undefined || input.cursor !== undefined))
        throw amplitudeServiceError(
          'replayIds cannot be combined with amplitudeId or cursor.'
        );
      if (
        input.startTime &&
        input.endTime &&
        Date.parse(input.endTime) < Date.parse(input.startTime)
      )
        throw amplitudeServiceError('endTime must be on or after startTime.');
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries({
        start_time: input.startTime,
        end_time: input.endTime,
        amplitude_id: input.amplitudeId,
        page_token: input.cursor,
        page_size: input.limit,
        sort_order: input.sortOrder
      }))
        if (value !== undefined) params.set(key, String(value));
      for (const id of input.replayIds ?? []) params.append('replay_id', id);
      return parseResponse(
        z.object({
          session_replays: z.array(
            z.object({
              replay_id: z.string(),
              session_id: z.string(),
              device_id: z.string(),
              amplitude_id: amplitudeIdSchema,
              start_time: z.string(),
              end_time: z.string(),
              retention_in_days: z.number()
            })
          ),
          next_page_token: z.string().nullable()
        }),
        await get('/1/session-replays', params),
        'session replays'
      );
    },
    async exportSessionReplay(input: ReplayPageInput) {
      let page = await replayPage(input);
      const budget = { remaining: DOWNLOAD_LIMIT, replay: true };
      const files: DownloadedFile[] = [];
      let refreshed = false;
      for (let index = 0; index < page.files.length; index++) {
        let result = await downloadStorageFile(page.files[index]!, budget);
        if (result.expired && !refreshed) {
          const refresh = await replayPage(input);
          // Do not combine different snapshots after refreshing a presigned URL.
          const keys = (urls: string[]) =>
            urls.map(url => new URL(validateStorageUrl(url)).pathname);
          if (
            JSON.stringify(keys(refresh.files)) !== JSON.stringify(keys(page.files)) ||
            refresh.next_page_token !== page.next_page_token
          )
            throw amplitudeServiceError(
              'The replay file page changed while downloading. Retry the same cursor.'
            );
          page = refresh;
          refreshed = true;
          result = await downloadStorageFile(page.files[index]!, budget);
        }
        if (!result.file)
          throw amplitudeServiceError(
            'The replay download link expired or access was denied. Retry the same cursor.'
          );
        if (result.file.bytes[0] !== 0x1f || result.file.bytes[1] !== 0x8b)
          throw amplitudeServiceError(
            'Amplitude returned a replay file without the expected gzip format.'
          );
        files.push(result.file);
      }
      return { files, nextCursor: page.next_page_token };
    },
    async exportCohortMembers(input: {
      cohortId?: string;
      requestId?: string;
      includeProperties?: boolean;
      propertyKeys?: string[];
    }) {
      if ((input.cohortId !== undefined) === (input.requestId !== undefined))
        throw amplitudeServiceError(
          'Provide exactly one of cohortId to start an export or requestId to resume it.'
        );
      if (
        input.requestId &&
        (input.includeProperties !== undefined || input.propertyKeys !== undefined)
      )
        throw amplitudeServiceError(
          'includeProperties and propertyKeys apply only when starting an export with cohortId.'
        );
      if (input.propertyKeys && input.includeProperties === false)
        throw amplitudeServiceError(
          'propertyKeys requires includeProperties to be true or omitted.'
        );
      const deadline = Date.now() + 20_000;
      let request: z.infer<typeof cohortRequestSchema>;
      if (input.cohortId) {
        const params = new URLSearchParams({
          props: (input.includeProperties ?? !!input.propertyKeys) ? '1' : '0'
        });
        for (const key of input.propertyKeys ?? []) params.append('propKeys', key);
        request = parseResponse(
          cohortRequestSchema,
          await get(
            `/5/cohorts/request/${encodeURIComponent(input.cohortId)}`,
            params,
            deadline
          ),
          'cohort export request'
        );
      } else {
        request = { request_id: input.requestId!, cohort_id: '' };
      }
      try {
        while (Date.now() < deadline) {
          const status = await get(
            `/5/cohorts/request-status/${encodeURIComponent(request.request_id)}`,
            undefined,
            deadline
          );
          if (status === undefined) break;
          request = parseResponse(cohortRequestSchema, status, 'cohort export status');
          if (request.async_status === 'JOB COMPLETED') {
            const budget = { remaining: DOWNLOAD_LIMIT };
            const path = `/5/cohorts/request/${encodeURIComponent(request.request_id)}/file`;
            for (let attempt = 0; attempt < 2; attempt++) {
              let result = await receiveFile(ax, path, budget, true);
              if (result.redirect) result = await downloadStorageFile(result.redirect, budget);
              if (result.file)
                return {
                  requestId: request.request_id,
                  cohortId: request.cohort_id,
                  status: 'completed' as const,
                  file: result.file
                };
              if (!result.expired) break;
            }
            throw amplitudeServiceError(
              'The cohort download link expired or access was denied. Resume with the same requestId.'
            );
          }
          if (request.async_status !== 'JOB INPROGRESS')
            throw amplitudeServiceError(
              'Amplitude did not report a running or completed cohort export. Check the request status and retry.'
            );
          const remaining = deadline - Date.now();
          if (remaining <= 2_000) break;
          await new Promise(resolve => setTimeout(resolve, 2_000));
        }
        return {
          requestId: request.request_id,
          cohortId: request.cohort_id || null,
          status: 'pending' as const,
          file: undefined
        };
      } catch (error) {
        const detail =
          error instanceof ServiceError
            ? error.message
            : 'The cohort export could not be completed.';
        const resumable = amplitudeServiceError(
          `${detail} Resume this export with requestId "${request.request_id}"; do not start a new export.`,
          { reason: 'amplitude_cohort_export_incomplete', parent: error }
        );
        resumable.data.requestId = request.request_id;
        if (request.cohort_id) resumable.data.cohortId = request.cohort_id;
        if (error instanceof ServiceError) {
          resumable.data.upstreamStatus = error.data.upstreamStatus;
          resumable.data.upstreamCode = error.data.upstreamCode;
        }
        throw resumable;
      }
    },
    async queryRevenueLtv(input: {
      start: string;
      end: string;
      metric: 'arpu' | 'arppu' | 'total_revenue' | 'paying_users';
      interval: number;
      segment?: string;
      groupBy?: string;
    }) {
      validateDateRange(input.start, input.end);
      validateInterval(input.interval);
      const response = parseResponse(
        z.object({
          data: z.object({
            series: z.array(
              z.object({
                dates: z.array(z.string()),
                values: z.record(z.string(), z.record(z.string(), z.number().nullable()))
              })
            ),
            seriesLabels: z.array(z.unknown())
          })
        }),
        await get('/2/revenue/ltv', {
          start: input.start,
          end: input.end,
          m: { arpu: 0, arppu: 1, total_revenue: 2, paying_users: 3 }[input.metric],
          i: input.interval,
          s: serializeSegment(input.segment),
          g: serializeGroupBy(input.groupBy)
        }),
        'revenue lifetime value'
      );
      return response.data;
    },
    async queryRealtimeUsers() {
      return parseResponse(
        z.object({
          data: z.object({
            series: z.array(z.array(z.number().nullable())),
            seriesLabels: z.array(z.string()),
            xValues: z.array(z.string())
          })
        }),
        await get('/2/realtime'),
        'real-time users'
      ).data;
    }
  };
};
