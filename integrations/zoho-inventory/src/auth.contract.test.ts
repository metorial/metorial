import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { auth } from './auth';
import { config } from './config';
import { createClient } from './lib/helpers';

let httpCalls = vi.hoisted(() => ({
  configs: [] as Record<string, unknown>[]
}));

vi.mock('slates', async importOriginal => {
  let actual = await importOriginal<typeof import('slates')>();
  return {
    ...actual,
    createAxios: vi.fn((axiosConfig: Record<string, unknown>) => {
      httpCalls.configs.push(axiosConfig);
      return {
        defaults: { headers: { common: {} } },
        interceptors: { response: { use: vi.fn() } },
        get: vi.fn().mockResolvedValue({ data: {} }),
        post: vi.fn().mockResolvedValue({ data: {} }),
        put: vi.fn().mockResolvedValue({ data: {} }),
        patch: vi.fn().mockResolvedValue({ data: {} }),
        delete: vi.fn().mockResolvedValue({ data: {} })
      };
    })
  };
});

type JsonSchema = {
  type?: string;
  required?: string[];
  properties?: Record<string, JsonSchema>;
  additionalProperties?: boolean;
  enum?: string[];
  default?: unknown;
};

let supportedRegions = ['us', 'eu', 'in', 'au', 'jp', 'ca', 'sa'] as const;

let expectedScopes = [
  'ZohoInventory.FullAccess.all',
  'ZohoInventory.contacts.READ',
  'ZohoInventory.contacts.CREATE',
  'ZohoInventory.contacts.UPDATE',
  'ZohoInventory.contacts.DELETE',
  'ZohoInventory.items.READ',
  'ZohoInventory.items.CREATE',
  'ZohoInventory.items.UPDATE',
  'ZohoInventory.items.DELETE',
  'ZohoInventory.inventoryadjustments.CREATE',
  'ZohoInventory.inventoryadjustments.DELETE',
  'ZohoInventory.transferorders.READ',
  'ZohoInventory.transferorders.CREATE',
  'ZohoInventory.transferorders.UPDATE',
  'ZohoInventory.transferorders.DELETE',
  'ZohoInventory.salesorders.READ',
  'ZohoInventory.salesorders.CREATE',
  'ZohoInventory.salesorders.UPDATE',
  'ZohoInventory.salesorders.DELETE',
  'ZohoInventory.packages.CREATE',
  'ZohoInventory.packages.DELETE',
  'ZohoInventory.shipmentorders.READ',
  'ZohoInventory.shipmentorders.CREATE',
  'ZohoInventory.shipmentorders.UPDATE',
  'ZohoInventory.shipmentorders.DELETE',
  'ZohoInventory.invoices.READ',
  'ZohoInventory.invoices.CREATE',
  'ZohoInventory.invoices.UPDATE',
  'ZohoInventory.invoices.DELETE',
  'ZohoInventory.customerpayments.CREATE',
  'ZohoInventory.customerpayments.DELETE',
  'ZohoInventory.creditnotes.READ',
  'ZohoInventory.creditnotes.CREATE',
  'ZohoInventory.creditnotes.UPDATE',
  'ZohoInventory.creditnotes.DELETE',
  'ZohoInventory.purchaseorders.READ',
  'ZohoInventory.purchaseorders.CREATE',
  'ZohoInventory.purchaseorders.UPDATE',
  'ZohoInventory.purchaseorders.DELETE',
  'ZohoInventory.bills.READ',
  'ZohoInventory.bills.CREATE',
  'ZohoInventory.bills.UPDATE',
  'ZohoInventory.bills.DELETE',
  'ZohoInventory.settings.READ'
];

let canonicalAuth = {
  token: 'access-token',
  applicationType: 'multi_dc',
  region: 'eu',
  accountsUrl: 'https://accounts.zoho.eu',
  apiDomain: 'https://www.zohoapis.eu'
};

let toJsonSchema = (schema: z.ZodType): JsonSchema => z.toJSONSchema(schema) as JsonSchema;
let oauthMethod = () => auth.authStack.find(method => method.type === 'auth.oauth') as any;
let createInventoryClient = (authOutput: Record<string, unknown>) =>
  createClient({ auth: authOutput, config: { organizationId: 'organization-id' } } as any);

describe('Zoho Inventory auth and config contract', () => {
  beforeEach(() => {
    httpCalls.configs.length = 0;
  });

  it('advertises exactly one oauth method', () => {
    expect(
      auth.authStack.map(method => ({ type: method.type, key: method.key, name: method.name }))
    ).toEqual([{ type: 'auth.oauth', key: 'oauth', name: 'OAuth' }]);
  });

  it('requires application type and keeps region optional without defaults', () => {
    let method = oauthMethod();
    expect(method).toBeDefined();
    let inputSchema = toJsonSchema(method?.inputSchema ?? z.object({}));

    expect(inputSchema.type).toBe('object');
    expect(inputSchema.additionalProperties).toBe(false);
    expect(inputSchema.properties?.applicationType?.enum).toEqual(['multi_dc', 'regional']);
    expect(inputSchema.properties?.applicationType).not.toHaveProperty('default');
    expect(inputSchema.properties?.region?.enum).toEqual(supportedRegions);
    expect(inputSchema.properties?.region).not.toHaveProperty('default');
    expect(inputSchema.required).toEqual(['applicationType']);
    expect(method?.inputSchema?.safeParse({}).success).toBe(false);
    expect(method?.inputSchema?.safeParse({ applicationType: 'multi_dc' }).success).toBe(true);
    expect(method?.inputSchema?.safeParse({ applicationType: 'regional' }).success).toBe(true);
  });

  it('pins the audited minimal OAuth scope array', () => {
    expect((auth.authStack[0] as any)?.scopes.map((scope: any) => scope.scope)).toEqual(
      expectedScopes
    );
  });

  it('emits only the canonical auth output fields', () => {
    let outputSchema = toJsonSchema(auth.outputSchema);

    expect(Object.keys(outputSchema.properties ?? {}).sort()).toEqual(
      [
        'token',
        'refreshToken',
        'expiresAt',
        'applicationType',
        'region',
        'accountsUrl',
        'apiDomain'
      ].sort()
    );
    expect(outputSchema.required?.sort()).toEqual(
      ['token', 'applicationType', 'region', 'accountsUrl', 'apiDomain'].sort()
    );
    expect(outputSchema.additionalProperties).toBe(false);
  });

  it('accepts canonical auth output with optional refresh metadata', () => {
    let value = {
      ...canonicalAuth,
      refreshToken: 'refresh-token',
      expiresAt: '2030-01-01T00:00:00.000Z'
    };

    expect(auth.outputSchema.safeParse(canonicalAuth).success).toBe(true);
    expect(auth.outputSchema.safeParse(value)).toMatchObject({ success: true, data: value });
  });

  it.each([
    'token',
    'applicationType',
    'region',
    'accountsUrl',
    'apiDomain'
  ])('rejects canonical auth output missing %s', field => {
    let value = { ...canonicalAuth } as Record<string, unknown>;
    delete value[field];
    expect(auth.outputSchema.safeParse(value).success).toBe(false);
  });

  it('emits a closed top-level config object without regional routing', () => {
    let configSchema = toJsonSchema(config.configSchema);

    expect(configSchema.type).toBe('object');
    expect(configSchema.additionalProperties).toBe(false);
    expect(Object.keys(configSchema.properties ?? {})).toEqual(['organizationId']);
    expect(configSchema.properties).not.toHaveProperty('region');
    expect(configSchema.properties).not.toHaveProperty('dataCenterDomain');
  });

  it('strips auth-owned routing fields from legacy-shaped config', () => {
    expect(
      config.configSchema.parse({
        organizationId: 'organization-id',
        region: 'eu',
        dataCenterDomain: 'eu'
      })
    ).toEqual({ organizationId: 'organization-id' });
  });

  it('constructs the client from canonical auth output', () => {
    expect(() => createInventoryClient(canonicalAuth)).not.toThrow();
    expect(httpCalls.configs.map(value => value.baseURL)).toEqual([
      'https://www.zohoapis.eu/inventory/v1'
    ]);
  });

  it.each([
    { field: 'token', message: /token/i },
    { field: 'apiDomain', message: /api.?domain/i }
  ])('fails clearly when client auth is missing $field', ({ field, message }) => {
    let value = { ...canonicalAuth } as Record<string, unknown>;
    delete value[field];
    expect(() => createInventoryClient(value)).toThrow(message);
  });
});
