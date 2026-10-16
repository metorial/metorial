import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let upsertTenant = SlateTool.create(spec, {
  name: 'Upsert Tenant',
  key: 'upsert_tenant',
  description: `Create or update a tenant. Tenants let you organize customers to match your product's structure (e.g., teams, organizations). Uses an upsert pattern — matched by identifier, created if not found, updated otherwise.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      identifier: z
        .object({
          tenantId: z.string().optional().describe('Plain tenant ID'),
          externalId: z.string().optional().describe('External tenant ID')
        })
        .describe('Identifier for the tenant (provide one)'),
      name: z.string().describe('Tenant name'),
      externalId: z
        .string()
        .optional()
        .describe(
          'External ID to set; defaults to identifier.externalId or the existing tenant external ID'
        ),
      url: z.string().optional().describe('URL associated with the tenant')
    })
  )
  .output(
    z.object({
      tenantId: z.string().describe('Plain tenant ID'),
      name: z.string().describe('Tenant name'),
      externalId: z.string().nullable().describe('External ID'),
      url: z.string().nullable().describe('Tenant URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    if (
      Object.values(ctx.input.identifier).filter(value => value !== undefined).length !== 1
    ) {
      throw createApiServiceError(
        'Provide exactly one tenant identifier: tenantId or externalId'
      );
    }

    let externalId = ctx.input.externalId ?? ctx.input.identifier.externalId;
    if (externalId === undefined && ctx.input.identifier.tenantId) {
      externalId = (await client.getTenant(ctx.input.identifier.tenantId)).externalId;
    }
    if (!externalId) {
      throw createApiServiceError(
        'Provide an externalId or identify an existing tenant by tenantId'
      );
    }
    let input: any = {
      identifier: ctx.input.identifier,
      name: ctx.input.name,
      externalId
    };
    if (ctx.input.url !== undefined) {
      input.url = { value: ctx.input.url };
    }

    let res = await client.upsertTenant(input);
    let tenant = res.tenant;

    return {
      output: {
        tenantId: tenant.id,
        name: tenant.name,
        externalId: tenant.externalId,
        url: tenant.url
      },
      message: `Tenant **${tenant.name}** upserted`
    };
  })
  .build();
