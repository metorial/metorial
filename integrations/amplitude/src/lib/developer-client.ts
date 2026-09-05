import { ServiceError } from '@lowerdeck/error';
import { createApiServiceError, createAxios, isApiErrorRecord } from 'slates';
import { z } from 'zod';
import type { AmplitudeRegion } from './client';
import { amplitudeApiError } from './errors';

export const developerPaginationSchema = z
  .object({
    next_cursor: z.string().nullable(),
    has_more: z.boolean()
  })
  .passthrough();

export const developerObjectSchema = z
  .object({
    id: z.string(),
    object: z.string()
  })
  .passthrough();

export const developerListSchema = z
  .object({
    data: z.array(developerObjectSchema),
    pagination: developerPaginationSchema
  })
  .passthrough();

export const developerResultSchema = z
  .object({
    data: z.record(z.string(), z.unknown())
  })
  .passthrough();

export type DeveloperPageInput = { cursor?: string; limit?: number; q?: string };
export type DeveloperChartQuery = {
  time_range?: { start: string; end: string };
  timezone?: string;
  exclude_incomplete_datapoints?: boolean;
  group_by_limit?: number;
  time_series_limit?: number;
};

export const createAmplitudeDeveloperClient = (ctx: {
  auth: { token?: string; region?: AmplitudeRegion; apiKey?: string; secretKey?: string };
}) => {
  if (
    !ctx.auth.token ||
    (ctx.auth.region !== 'US' && ctx.auth.region !== 'EU') ||
    ctx.auth.apiKey ||
    ctx.auth.secretKey
  ) {
    throw createApiServiceError(
      'Connect with Amplitude OAuth to use this tool. Project API-key credentials do not authorize the Developer API.',
      { reason: 'amplitude_oauth_required' }
    );
  }
  return new AmplitudeDeveloperClient({ token: ctx.auth.token, region: ctx.auth.region });
};

export class AmplitudeDeveloperClient {
  private ax: ReturnType<typeof createAxios>;

  constructor(auth: { token: string; region: AmplitudeRegion }) {
    this.ax = createAxios({
      baseURL:
        auth.region === 'EU'
          ? 'https://developer-api.eu.amplitude.com'
          : 'https://developer-api.amplitude.com',
      headers: { Authorization: `Bearer ${auth.token}`, Accept: 'application/json' },
      timeout: 120_000,
      maxRedirects: 0
    });
  }

  private async request<S extends z.ZodType>(
    method: 'GET' | 'POST',
    path: string,
    schema: S,
    options?: { params?: object; data?: object }
  ): Promise<z.infer<S>> {
    try {
      const response = await this.ax.request({ method, url: path, ...options });
      if (
        isApiErrorRecord(response.data) &&
        (response.data.success === false ||
          (typeof response.data.status === 'number' && response.data.status >= 400))
      ) {
        throw amplitudeApiError({ response }, 'Developer API request');
      }
      const result = schema.safeParse(response.data);
      if (!result.success)
        throw createApiServiceError(
          'Amplitude returned an unexpected Developer API response.',
          { reason: 'amplitude_invalid_response' }
        );
      return result.data;
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw amplitudeApiError(error, 'Developer API request');
    }
  }

  getContext() {
    return this.request('GET', '/v1/context', developerResultSchema);
  }
  listProjects(input: DeveloperPageInput & { sort?: string } = {}) {
    return this.request('GET', '/v1/projects', developerListSchema, { params: input });
  }
  listCharts(
    projectId: string,
    input: DeveloperPageInput & { chart_type?: string; sort?: string } = {}
  ) {
    return this.request(
      'GET',
      `/v1/projects/${encodeURIComponent(projectId)}/charts`,
      developerListSchema,
      { params: input }
    );
  }
  getChart(projectId: string, chartId: string, includeDefinition?: boolean) {
    return this.request(
      'GET',
      `/v1/projects/${encodeURIComponent(projectId)}/charts/${encodeURIComponent(chartId)}`,
      developerResultSchema,
      { params: { include_definition: includeDefinition } }
    );
  }
  queryChart(projectId: string, chartId: string, input: DeveloperChartQuery = {}) {
    return this.request(
      'POST',
      `/v1/projects/${encodeURIComponent(projectId)}/charts/${encodeURIComponent(chartId)}/query`,
      developerResultSchema,
      { data: input }
    );
  }
  listEvents(projectId: string, input: DeveloperPageInput = {}) {
    return this.request(
      'GET',
      `/v1/projects/${encodeURIComponent(projectId)}/events`,
      developerListSchema,
      { params: input }
    );
  }
  getEvent(projectId: string, eventId: string) {
    return this.request(
      'GET',
      `/v1/projects/${encodeURIComponent(projectId)}/events/${encodeURIComponent(eventId)}`,
      developerResultSchema
    );
  }
  listEventProperties(projectId: string, eventId: string, input: DeveloperPageInput = {}) {
    return this.request(
      'GET',
      `/v1/projects/${encodeURIComponent(projectId)}/events/${encodeURIComponent(eventId)}/event-properties`,
      developerListSchema,
      { params: input }
    );
  }
  listUserProperties(projectId: string, input: DeveloperPageInput = {}) {
    return this.request(
      'GET',
      `/v1/projects/${encodeURIComponent(projectId)}/user-properties`,
      developerListSchema,
      { params: input }
    );
  }
  listFlags(projectId: string, input: Pick<DeveloperPageInput, 'cursor' | 'limit'> = {}) {
    return this.request(
      'GET',
      `/v1/projects/${encodeURIComponent(projectId)}/flags`,
      developerListSchema,
      { params: input }
    );
  }
  getFlag(projectId: string, flagId: string) {
    return this.request(
      'GET',
      `/v1/projects/${encodeURIComponent(projectId)}/flags/${encodeURIComponent(flagId)}`,
      developerResultSchema
    );
  }
}
