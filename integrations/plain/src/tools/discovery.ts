import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let pageInput = z.object({
  first: z.number().optional().default(25).describe('Number of records to return (1–100)'),
  after: z.string().optional().describe('endCursor from the previous page')
});
let pageOutput = {
  hasNextPage: z.boolean(),
  endCursor: z.string().nullable()
};
let tenantSchema = z.object({
  tenantId: z.string(),
  name: z.string(),
  externalId: z.string(),
  url: z.string().nullable(),
  tierId: z.string().nullable(),
  tierName: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});
let mapTenant = (tenant: any) => ({
  tenantId: tenant.id,
  name: tenant.name,
  externalId: tenant.externalId,
  url: tenant.url,
  tierId: tenant.tier?.id ?? null,
  tierName: tenant.tier?.name ?? null,
  createdAt: tenant.createdAt.iso8601,
  updatedAt: tenant.updatedAt.iso8601
});

export let getCurrentUser = SlateTool.create(spec, {
  key: 'get_current_user',
  name: 'Get Current User',
  description: 'Identify the machine user and workspace associated with the API key.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      machineUser: z.object({
        id: z.string(),
        fullName: z.string(),
        publicName: z.string(),
        description: z.string().nullable()
      }),
      workspace: z.object({ id: z.string(), name: z.string(), publicName: z.string() })
    })
  )
  .handleInvocation(async ctx => {
    let identity = await new Client({ token: ctx.auth.token }).getCurrentIdentity();
    return {
      output: { machineUser: identity.myMachineUser, workspace: identity.myWorkspace },
      message: `Authenticated as **${identity.myMachineUser.fullName}** in **${identity.myWorkspace.name}**`
    };
  })
  .build();

export let listUsers = SlateTool.create(spec, {
  key: 'list_users',
  name: 'List Users',
  description:
    'List workspace team members and their IDs for assign_thread. Optionally return only assignable users.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    pageInput.extend({
      isAssignableToThread: z
        .boolean()
        .optional()
        .describe('Filter to users who can be assigned threads')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.string(),
          fullName: z.string(),
          publicName: z.string(),
          email: z.string()
        })
      ),
      ...pageOutput
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).getUsers(
      ctx.input.first,
      ctx.input.after,
      ctx.input.isAssignableToThread
    );
    return {
      output: {
        users: result.edges.map(({ node }: any) => ({
          userId: node.id,
          fullName: node.fullName,
          publicName: node.publicName,
          email: node.email
        })),
        hasNextPage: result.pageInfo.hasNextPage,
        endCursor: result.pageInfo.endCursor
      },
      message: `Returned **${result.edges.length}** records`
    };
  })
  .build();

export let listCompanies = SlateTool.create(spec, {
  key: 'list_companies',
  name: 'List Companies',
  description: 'List companies and their IDs and domains for update_customer_company.',
  tags: { readOnly: true, destructive: false }
})
  .input(pageInput)
  .output(
    z.object({
      companies: z.array(
        z.object({
          companyId: z.string(),
          name: z.string(),
          domainName: z.string(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      ...pageOutput
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).getCompanies(
      ctx.input.first,
      ctx.input.after
    );
    return {
      output: {
        companies: result.edges.map(({ node }: any) => ({
          companyId: node.id,
          name: node.name,
          domainName: node.domainName,
          createdAt: node.createdAt.iso8601,
          updatedAt: node.updatedAt.iso8601
        })),
        hasNextPage: result.pageInfo.hasNextPage,
        endCursor: result.pageInfo.endCursor
      },
      message: `Returned **${result.edges.length}** records`
    };
  })
  .build();

export let listTenants = SlateTool.create(spec, {
  key: 'list_tenants',
  name: 'List Tenants',
  description:
    'List tenants and their IDs, external IDs, and tiers for customer membership and thread operations.',
  tags: { readOnly: true, destructive: false }
})
  .input(pageInput)
  .output(z.object({ tenants: z.array(tenantSchema), ...pageOutput }))
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).getTenants(
      ctx.input.first,
      ctx.input.after
    );
    return {
      output: {
        tenants: result.edges.map(({ node }: any) => mapTenant(node)),
        hasNextPage: result.pageInfo.hasNextPage,
        endCursor: result.pageInfo.endCursor
      },
      message: `Returned **${result.edges.length}** records`
    };
  })
  .build();

export let getTenant = SlateTool.create(spec, {
  key: 'get_tenant',
  name: 'Get Tenant',
  description:
    'Get a tenant by its ID from list_tenants, including its external ID, URL, tier, and timestamps.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ tenantId: z.string().describe('Tenant ID from list_tenants') }))
  .output(tenantSchema)
  .handleInvocation(async ctx => ({
    output: mapTenant(
      await new Client({ token: ctx.auth.token }).getTenant(ctx.input.tenantId)
    ),
    message: `Retrieved tenant **${ctx.input.tenantId}**`
  }))
  .build();
