import { ServiceError } from '@lowerdeck/error';
import { createApiServiceError, createAxios, isApiErrorRecord } from 'slates';
import { z } from 'zod';
import type { AmplitudeRegion } from './client';
import { amplitudeApiError } from './errors';

export const experimentResultSchema = z.record(z.string(), z.unknown());

export const createAmplitudeExperimentClient = (ctx: {
  auth: {
    experimentManagementKey?: string;
    apiKey?: string;
    secretKey?: string;
    region?: AmplitudeRegion;
  };
  config?: { region?: unknown };
}) => {
  if (!ctx.auth.experimentManagementKey || !ctx.auth.apiKey || !ctx.auth.secretKey) {
    throw createApiServiceError(
      'Add an Experiment management API key to your API Key + Secret Key connection. Project keys, deployment keys, and OAuth tokens do not authorize the Experiment Management API.',
      { reason: 'amplitude_experiment_management_key_required' }
    );
  }
  const region = ctx.auth.region ?? ctx.config?.region ?? 'US';
  if (region !== 'US' && region !== 'EU')
    throw createApiServiceError('Amplitude region must be US or EU.', {
      reason: 'amplitude_invalid_region'
    });
  const ax = createAxios({
    baseURL:
      region === 'EU'
        ? 'https://experiment.eu.amplitude.com/api/1'
        : 'https://experiment.amplitude.com/api/1',
    headers: {
      Authorization: `Bearer ${ctx.auth.experimentManagementKey}`,
      Accept: 'application/json'
    },
    timeout: 30_000,
    maxRedirects: 0
  });
  const get = async (path: string, params?: object) => {
    try {
      const response = await ax.get(path, { params });
      if (
        isApiErrorRecord(response.data) &&
        (response.data.error || response.data.success === false)
      )
        throw amplitudeApiError({ response }, 'Experiment Management API request');
      const parsed = experimentResultSchema.safeParse(response.data);
      if (!parsed.success)
        throw createApiServiceError(
          'Amplitude returned an unexpected Experiment Management API response.',
          { reason: 'amplitude_invalid_response' }
        );
      return parsed.data;
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw amplitudeApiError(error, 'Experiment Management API request');
    }
  };
  return {
    getFlag: (id: string) => get(`/flags/${encodeURIComponent(id)}`),
    listFlags: (params: { projectId?: string; limit?: number; cursor?: number }) =>
      get('/flags', params),
    getExperiment: (id: string) => get(`/experiments/${encodeURIComponent(id)}`),
    listExperiments: (params: {
      key?: string;
      projectId?: string;
      limit?: number;
      cursor?: number;
      includeArchived?: boolean;
      deliveryMethod?: 'feature' | 'web';
    }) => get('/experiments', params),
    listDeployments: (params: { limit?: number; cursor?: number }) =>
      get('/deployments', params)
  };
};
