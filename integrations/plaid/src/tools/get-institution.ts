import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaidClient } from '../lib/client';
import { spec } from '../spec';

let statusSchema = z
  .object({
    status: z.string().describe('Status: HEALTHY, DEGRADED, or DOWN'),
    lastStatusChange: z
      .string()
      .nullable()
      .optional()
      .describe('ISO 8601 timestamp of last status change')
  })
  .optional();

let institutionDetailSchema = z.object({
  institutionId: z.string().describe('Plaid institution identifier'),
  name: z.string().describe('Institution name'),
  products: z.array(z.string()).describe('Supported products'),
  countryCodes: z.array(z.string()).describe('Supported country codes'),
  oauth: z.boolean().optional().describe('Whether the institution supports OAuth'),
  url: z.string().nullable().optional().describe('Institution website URL'),
  primaryColor: z.string().nullable().optional().describe('Brand primary color hex'),
  status: z
    .object({
      itemLogins: statusSchema,
      transactionsUpdates: statusSchema,
      auth: statusSchema,
      balance: statusSchema,
      identity: statusSchema
    })
    .optional()
    .describe('Current health status by product')
});

export let getInstitutionTool = SlateTool.create(spec, {
  name: 'Get Institution',
  key: 'get_institution',
  description: `Retrieve detailed information about a specific financial institution by its Plaid institution ID. Optionally includes the institution's current health status per product.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      institutionId: z.string().describe('Plaid institution ID (e.g. ins_3)'),
      countryCodes: z.array(z.string()).default(['US']).describe('Country codes'),
      includeStatus: z.boolean().optional().describe('Include health status information')
    })
  )
  .output(
    z.object({
      institution: institutionDetailSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaidClient({
      clientId: ctx.auth.clientId,
      secret: ctx.auth.secret,
      environment: ctx.config.environment
    });

    let result = await client.getInstitutionById(
      ctx.input.institutionId,
      ctx.input.countryCodes,
      {
        includeOptionalMetadata: true,
        includeStatus: ctx.input.includeStatus
      }
    );

    let inst = result.institution;
    let mapStatus = (s: any) =>
      s ? { status: s.status, lastStatusChange: s.last_status_change ?? null } : undefined;

    let institution = {
      institutionId: inst.institution_id,
      name: inst.name,
      products: inst.products || [],
      countryCodes: inst.country_codes || [],
      oauth: inst.oauth,
      url: inst.url ?? null,
      primaryColor: inst.primary_color ?? null,
      ...(inst.status && {
        status: {
          itemLogins: mapStatus(inst.status.item_logins),
          transactionsUpdates: mapStatus(inst.status.transactions_updates),
          auth: mapStatus(inst.status.auth),
          balance: mapStatus(inst.status.balance),
          identity: mapStatus(inst.status.identity)
        }
      })
    };

    return {
      output: { institution },
      message: `Retrieved details for **${inst.name}** (\`${inst.institution_id}\`).`
    };
  })
  .build();
