import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { auth } from './auth';
import { config } from './config';
import {
  ZohoBooksClient,
  ZohoCrmClient,
  ZohoDeskClient,
  ZohoPeopleClient,
  ZohoProjectsClient
} from './lib/client';

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

let supportedRegions = ['us', 'eu', 'in', 'au', 'jp', 'ca', 'sa', 'uk'] as const;

let expectedScopes = [
  'ZohoCRM.modules.ALL',
  'ZohoCRM.settings.ALL',
  'ZohoCRM.notifications.ALL',
  'ZohoCRM.coql.READ',
  'ZohoSearch.securesearch.READ',
  'ZohoCRM.users.READ',
  'Desk.tickets.ALL',
  'Desk.contacts.ALL',
  'Desk.basic.READ',
  'Desk.search.READ',
  'ZohoBooks.fullaccess.all',
  'ZohoBooks.invoices.ALL',
  'ZohoBooks.contacts.ALL',
  'ZohoBooks.expenses.ALL',
  'ZohoBooks.settings.READ',
  'ZOHOPEOPLE.forms.ALL',
  'ZOHOPEOPLE.attendance.READ',
  'ZOHOPEOPLE.leave.READ',
  'ZohoProjects.portals.READ',
  'ZohoProjects.projects.ALL',
  'ZohoProjects.tasks.ALL',
  'ZohoProjects.milestones.READ',
  'AaaServer.profile.READ'
];

let canonicalAuth = {
  token: 'access-token',
  applicationType: 'multi_dc',
  region: 'eu',
  accountsUrl: 'https://accounts.zoho.eu',
  apiDomain: 'https://www.zohoapis.eu'
};

let regionalOrigins = [
  [
    'us',
    'https://accounts.zoho.com',
    'https://www.zohoapis.com',
    'https://desk.zoho.com',
    'https://people.zoho.com',
    'https://projectsapi.zoho.com'
  ],
  [
    'eu',
    'https://accounts.zoho.eu',
    'https://www.zohoapis.eu',
    'https://desk.zoho.eu',
    'https://people.zoho.eu',
    'https://projectsapi.zoho.eu'
  ],
  [
    'in',
    'https://accounts.zoho.in',
    'https://www.zohoapis.in',
    'https://desk.zoho.in',
    'https://people.zoho.in',
    'https://projectsapi.zoho.in'
  ],
  [
    'au',
    'https://accounts.zoho.com.au',
    'https://www.zohoapis.com.au',
    'https://desk.zoho.com.au',
    'https://people.zoho.com.au',
    'https://projectsapi.zoho.com.au'
  ],
  [
    'jp',
    'https://accounts.zoho.jp',
    'https://www.zohoapis.jp',
    'https://desk.zoho.jp',
    'https://people.zoho.jp',
    'https://projectsapi.zoho.jp'
  ],
  [
    'ca',
    'https://accounts.zohocloud.ca',
    'https://www.zohoapis.ca',
    'https://desk.zohocloud.ca',
    'https://people.zohocloud.ca',
    'https://projectsapi.zohocloud.ca'
  ],
  [
    'sa',
    'https://accounts.zoho.sa',
    'https://www.zohoapis.sa',
    'https://desk.zoho.sa',
    'https://people.zoho.sa',
    null
  ],
  [
    'uk',
    'https://accounts.zoho.uk',
    'https://www.zohoapis.uk',
    'https://desk.zoho.uk',
    'https://people.zoho.uk',
    null
  ]
] as const;

let toJsonSchema = (schema: z.ZodType): JsonSchema => z.toJSONSchema(schema) as JsonSchema;
let oauthMethod = () => auth.authStack.find(method => method.type === 'auth.oauth') as any;

let createClients = (authOutput: Record<string, unknown>) => {
  new ZohoCrmClient(authOutput as any);
  new ZohoPeopleClient(authOutput as any);
};

describe('Zoho auth and config contract', () => {
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
    expect(configSchema.properties).toEqual({});
    expect(configSchema.properties).not.toHaveProperty('datacenter');
  });

  it('strips the removed datacenter field from legacy config', () => {
    expect(config.configSchema.parse({ datacenter: 'eu' })).toEqual({});
  });

  it.each(
    regionalOrigins
  )('routes %s clients through canonical and explicit service origins', (region, accountsUrl, apiDomain, deskOrigin, peopleOrigin, projectsOrigin) => {
    let authOutput = {
      token: 'access-token',
      applicationType: 'multi_dc' as const,
      region,
      accountsUrl,
      apiDomain
    };

    expect(() => {
      new ZohoCrmClient(authOutput);
      new ZohoDeskClient({ ...authOutput, orgId: 'org-id' });
      new ZohoBooksClient({ ...authOutput, organizationId: 'organization-id' });
      new ZohoPeopleClient(authOutput);
    }).not.toThrow();

    let expectedBaseUrls = [
      `${apiDomain}/crm/v7`,
      `${deskOrigin}/api/v1`,
      `${apiDomain}/books/v3`,
      `${peopleOrigin}/people/api`
    ];

    if (projectsOrigin) {
      expect(
        () => new ZohoProjectsClient({ ...authOutput, portalId: 'portal-id' })
      ).not.toThrow();
      expectedBaseUrls.push(`${projectsOrigin}/api/v3/portal/portal-id`);
    } else {
      expect(() => new ZohoProjectsClient({ ...authOutput, portalId: 'portal-id' })).toThrow(
        ServiceError
      );
    }

    expect(httpCalls.configs.map(value => value.baseURL)).toEqual(expectedBaseUrls);
  });

  it('constructs generic and regional clients from canonical auth output', () => {
    expect(() => createClients(canonicalAuth)).not.toThrow();
    expect(httpCalls.configs.map(value => value.baseURL)).toEqual([
      'https://www.zohoapis.eu/crm/v7',
      'https://people.zoho.eu/people/api'
    ]);
  });

  it.each([
    { field: 'token', message: /token/i },
    { field: 'apiDomain', message: /api.?domain/i },
    { field: 'region', message: /region/i },
    { field: 'accountsUrl', message: /accounts/i }
  ])('fails clearly when client auth is missing $field', ({ field, message }) => {
    let value = { ...canonicalAuth } as Record<string, unknown>;
    delete value[field];
    expect(() => createClients(value)).toThrow(message);
  });
});
