import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { auth } from './auth';
import { config } from './config';
import { Client } from './lib/client';

let httpCalls = vi.hoisted(() => ({
  configs: [] as Record<string, unknown>[],
  getPaths: [] as string[],
  getResponseData: {} as Record<string, unknown>
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
        get: vi.fn().mockImplementation((path: string) => {
          httpCalls.getPaths.push(path);
          return Promise.resolve({ data: httpCalls.getResponseData });
        }),
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

let supportedRegions = ['us', 'eu', 'in', 'au', 'jp', 'ca'] as const;

let expectedScopes = [
  'ZohoInvoice.fullaccess.all',
  'ZohoInvoice.contacts.CREATE',
  'ZohoInvoice.contacts.READ',
  'ZohoInvoice.contacts.UPDATE',
  'ZohoInvoice.invoices.CREATE',
  'ZohoInvoice.invoices.READ',
  'ZohoInvoice.invoices.UPDATE',
  'ZohoInvoice.estimates.CREATE',
  'ZohoInvoice.estimates.READ',
  'ZohoInvoice.estimates.UPDATE',
  'ZohoInvoice.customerpayments.CREATE',
  'ZohoInvoice.customerpayments.READ',
  'ZohoInvoice.customerpayments.UPDATE',
  'ZohoInvoice.creditnotes.CREATE',
  'ZohoInvoice.creditnotes.READ',
  'ZohoInvoice.creditnotes.UPDATE',
  'ZohoInvoice.expenses.CREATE',
  'ZohoInvoice.expenses.READ',
  'ZohoInvoice.expenses.UPDATE',
  'ZohoInvoice.projects.CREATE',
  'ZohoInvoice.projects.READ',
  'ZohoInvoice.projects.UPDATE',
  'ZohoInvoice.settings.CREATE',
  'ZohoInvoice.settings.READ',
  'ZohoInvoice.settings.UPDATE'
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
let useInvoiceClient = async (authOutput: Record<string, unknown>) => {
  let client = new Client({ ...authOutput, organizationId: 'organization-id' } as any);
  await client.listInvoices();
};

describe('Zoho Invoice auth and config contract', () => {
  beforeEach(() => {
    httpCalls.configs.length = 0;
    httpCalls.getPaths.length = 0;
    httpCalls.getResponseData = {};
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
  });

  it('strips auth-owned routing fields from legacy-shaped config', () => {
    expect(
      config.configSchema.parse({ organizationId: 'organization-id', region: 'eu' })
    ).toEqual({ organizationId: 'organization-id' });
  });

  it('constructs the client from canonical auth output', async () => {
    await expect(useInvoiceClient(canonicalAuth)).resolves.toBeUndefined();
    expect(httpCalls.configs.map(value => value.baseURL)).toEqual([
      'https://www.zohoapis.eu/invoice/v3'
    ]);
  });

  it('looks up the auth profile through the canonical EU API domain', async () => {
    httpCalls.getResponseData = {
      code: 0,
      organizations: [
        {
          organization_id: 'organization-id',
          name: 'Example Company',
          email: 'billing@example.com'
        }
      ]
    };
    let method = oauthMethod();

    await expect(
      method.getProfile({
        input: { applicationType: 'multi_dc', region: 'eu' },
        scopes: expectedScopes,
        output: canonicalAuth
      })
    ).resolves.toEqual({
      profile: {
        id: 'organization-id',
        name: 'Example Company',
        email: 'billing@example.com'
      }
    });
    expect(httpCalls.configs).toEqual([
      {
        baseURL: 'https://www.zohoapis.eu/invoice/v3',
        headers: { Authorization: 'Zoho-oauthtoken access-token' }
      }
    ]);
  });

  it('returns a reconnect ServiceError when organization discovery is empty', async () => {
    httpCalls.getResponseData = { code: 0, organizations: [] };
    let method = oauthMethod();
    let error: unknown;

    try {
      await method.getProfile({
        input: { applicationType: 'multi_dc', region: 'eu' },
        scopes: expectedScopes,
        output: canonicalAuth
      });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ServiceError);
    expect(error).toMatchObject({
      message: expect.stringMatching(
        /did not return an organization for this account.*Reconnect the account/i
      )
    });
    expect(httpCalls.configs).toHaveLength(1);
    expect(httpCalls.getPaths).toEqual(['/organizations']);
  });

  it.each([
    { field: 'token', message: /access token/i },
    { field: 'accountsUrl', message: /Accounts origin/i },
    { field: 'apiDomain', message: /API domain/i }
  ])('rejects profile lookup before a request when auth is missing $field', async ({
    field,
    message
  }) => {
    let output = { ...canonicalAuth } as Record<string, unknown>;
    delete output[field];
    let method = oauthMethod();

    await expect(
      method.getProfile({
        input: { applicationType: 'multi_dc', region: 'eu' },
        scopes: expectedScopes,
        output
      })
    ).rejects.toThrow(message);
    expect(httpCalls.configs).toEqual([]);
  });

  it.each([
    { field: 'token', message: /token/i },
    { field: 'apiDomain', message: /api.?domain/i }
  ])('fails clearly when client auth is missing $field', async ({ field, message }) => {
    let value = { ...canonicalAuth } as Record<string, unknown>;
    delete value[field];
    await expect(useInvoiceClient(value)).rejects.toThrow(message);
  });
});
