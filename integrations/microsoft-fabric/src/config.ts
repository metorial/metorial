import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let DEFAULT_FABRIC_TENANT_ID = 'organizations';

export let config = SlateConfig.create(
  z.object({
    tenantId: z
      .string()
      .optional()
      .describe(
        'Optional Microsoft Entra tenant ID or alias used for OAuth. Defaults to organizations, which allows any work or school account tenant.'
      ),
    fabricApiBaseUrl: z
      .string()
      .url()
      .optional()
      .describe('Override for the Fabric REST base URL. Defaults to production.'),
    oneLakeApiBaseUrl: z
      .string()
      .url()
      .optional()
      .describe('Override for the OneLake API base URL. Defaults to production.'),
    oneLakeDfsBaseUrl: z
      .string()
      .url()
      .optional()
      .describe('Override for the OneLake DFS base URL. Defaults to production.'),
    oneLakeBlobBaseUrl: z
      .string()
      .url()
      .optional()
      .describe('Override for the OneLake Blob base URL. Defaults to production.'),
    oneLakeTableBaseUrl: z
      .string()
      .url()
      .optional()
      .describe('Override for the OneLake Table base URL. Defaults to production.')
  })
);

export type FabricRuntimeConfig = {
  tenantId: string;
  fabricApiBaseUrl: string;
  oneLakeApiBaseUrl: string;
  oneLakeDfsBaseUrl: string;
  oneLakeBlobBaseUrl: string;
  oneLakeTableBaseUrl: string;
};

export let resolveFabricRuntimeConfig = (configInput: Record<string, unknown> = {}) => ({
  tenantId:
    typeof configInput.tenantId === 'string' && configInput.tenantId.trim()
      ? configInput.tenantId.trim()
      : DEFAULT_FABRIC_TENANT_ID,
  fabricApiBaseUrl:
    typeof configInput.fabricApiBaseUrl === 'string'
      ? configInput.fabricApiBaseUrl
      : 'https://api.fabric.microsoft.com/v1',
  oneLakeApiBaseUrl:
    typeof configInput.oneLakeApiBaseUrl === 'string'
      ? configInput.oneLakeApiBaseUrl
      : 'https://api.onelake.fabric.microsoft.com',
  oneLakeDfsBaseUrl:
    typeof configInput.oneLakeDfsBaseUrl === 'string'
      ? configInput.oneLakeDfsBaseUrl
      : 'https://onelake.dfs.fabric.microsoft.com',
  oneLakeBlobBaseUrl:
    typeof configInput.oneLakeBlobBaseUrl === 'string'
      ? configInput.oneLakeBlobBaseUrl
      : 'https://onelake.blob.fabric.microsoft.com',
  oneLakeTableBaseUrl:
    typeof configInput.oneLakeTableBaseUrl === 'string'
      ? configInput.oneLakeTableBaseUrl
      : 'https://onelake.table.fabric.microsoft.com'
});
