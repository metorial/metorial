import { SlateConfig } from '@slates/provider';
import { z } from 'zod';
import { metorialValidationError } from './lib/errors';

export let DEFAULT_API_URL = 'https://api.metorial.com';
export let DEFAULT_API_VERSION = 'mt_2026_01_01_magnetar';

export type MetorialConfig = {
  apiUrl: string;
  apiVersion: string;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export let normalizeApiUrl = (apiUrl?: string | null) => {
  let raw = apiUrl?.trim() || DEFAULT_API_URL;

  try {
    let url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw metorialValidationError('Metorial apiUrl must use http or https.');
    }

    return url.toString().replace(/\/+$/, '');
  } catch (error) {
    if (error instanceof Error && error.name !== 'TypeError') throw error;
    throw metorialValidationError(`Invalid Metorial apiUrl: ${apiUrl ?? raw}`);
  }
};

export let normalizeMetorialConfig = (
  value: Partial<MetorialConfig> & Record<string, unknown> = {}
): MetorialConfig => ({
  apiUrl: normalizeApiUrl(typeof value.apiUrl === 'string' ? value.apiUrl : undefined),
  apiVersion:
    typeof value.apiVersion === 'string' && value.apiVersion.trim()
      ? value.apiVersion.trim()
      : DEFAULT_API_VERSION
});

export let resolveMetorialRuntimeConfig = (config?: unknown, auth?: { apiUrl?: string }) =>
  normalizeMetorialConfig({
    ...(isRecord(config) ? config : {}),
    ...(auth?.apiUrl ? { apiUrl: auth.apiUrl } : {})
  });

export let metorialConfigSchema = z.object({
  apiUrl: z
    .string()
    .optional()
    .default(DEFAULT_API_URL)
    .describe(
      'Metorial API base URL. Defaults to https://api.metorial.com. Trailing slashes are normalized.'
    ),
  apiVersion: z
    .string()
    .optional()
    .default(DEFAULT_API_VERSION)
    .describe('Metorial API version used for introspection and authenticated API calls.')
});

export let config = SlateConfig.create(metorialConfigSchema)
  .getDefaultConfig(() => normalizeMetorialConfig({}))
  .onConfigChanged(({ newConfig }) => ({
    config: normalizeMetorialConfig(newConfig)
  }));
