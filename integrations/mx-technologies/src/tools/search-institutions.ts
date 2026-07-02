import { SlateTool } from 'slates';
import { z } from 'zod';
import { MxClient } from '../lib/client';
import { spec } from '../spec';

let institutionSchema = z.object({
  code: z.string().optional().describe('Unique institution code'),
  name: z.string().optional().nullable().describe('Institution name'),
  mediumLogoUrl: z
    .string()
    .optional()
    .nullable()
    .describe('URL of the institution logo (medium)'),
  smallLogoUrl: z
    .string()
    .optional()
    .nullable()
    .describe('URL of the institution logo (small)'),
  url: z.string().optional().nullable().describe('Institution website URL'),
  supportsAccountVerification: z
    .boolean()
    .optional()
    .nullable()
    .describe('Whether the institution supports account verification'),
  supportsOauth: z
    .boolean()
    .optional()
    .nullable()
    .describe('Whether the institution supports OAuth connections'),
  supportsTransactionHistory: z
    .boolean()
    .optional()
    .nullable()
    .describe('Whether extended transaction history is supported')
});

let credentialSchema = z.object({
  guid: z.string().optional().describe('Credential GUID to use when creating a member'),
  fieldName: z.string().optional().nullable().describe('Name of the credential field'),
  fieldType: z
    .string()
    .optional()
    .nullable()
    .describe('Type of field (TEXT, PASSWORD, OPTIONS, etc.)'),
  label: z.string().optional().nullable().describe('Human-readable label'),
  displayOrder: z.number().optional().nullable().describe('Display order')
});

export let searchInstitutions = SlateTool.create(spec, {
  name: 'Search Institutions',
  key: 'search_institutions',
  description: `Search for financial institutions by name. Returns institution codes needed when creating members. You can filter by institutions that support specific features like account verification.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Search query to filter institutions by name'),
      supportsAccountVerification: z
        .boolean()
        .optional()
        .describe('Filter to institutions supporting account verification'),
      page: z.number().optional().describe('Page number'),
      recordsPerPage: z.number().optional().describe('Records per page (max: 100)')
    })
  )
  .output(
    z.object({
      institutions: z.array(institutionSchema),
      pagination: z
        .object({
          currentPage: z.number().optional(),
          perPage: z.number().optional(),
          totalEntries: z.number().optional(),
          totalPages: z.number().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    let result = await client.listInstitutions({
      name: ctx.input.name,
      supportsAccountVerification: ctx.input.supportsAccountVerification,
      page: ctx.input.page,
      recordsPerPage: ctx.input.recordsPerPage
    });

    let institutions = (result.institutions || []).map((i: any) => ({
      code: i.code,
      name: i.name,
      mediumLogoUrl: i.medium_logo_url,
      smallLogoUrl: i.small_logo_url,
      url: i.url,
      supportsAccountVerification: i.supports_account_verification,
      supportsOauth: i.supports_oauth,
      supportsTransactionHistory: i.supports_transaction_history
    }));

    return {
      output: {
        institutions,
        pagination: result.pagination
          ? {
              currentPage: result.pagination.current_page,
              perPage: result.pagination.per_page,
              totalEntries: result.pagination.total_entries,
              totalPages: result.pagination.total_pages
            }
          : undefined
      },
      message: `Found **${institutions.length}** institutions${ctx.input.name ? ` matching "${ctx.input.name}"` : ''}.`
    };
  })
  .build();

export let readInstitution = SlateTool.create(spec, {
  name: 'Read Institution',
  key: 'read_institution',
  description: `Get detailed information about a specific financial institution including supported features and capabilities. Also returns the required credentials for connecting to the institution.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      institutionCode: z
        .string()
        .describe('Unique code of the institution (e.g., "chase", "mx_bank")')
    })
  )
  .output(
    z.object({
      institution: institutionSchema,
      credentials: z.array(credentialSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });

    let [institution, credentials] = await Promise.all([
      client.readInstitution(ctx.input.institutionCode),
      client.listInstitutionCredentials(ctx.input.institutionCode)
    ]);

    let mappedCreds = (credentials || []).map((c: any) => ({
      guid: c.guid,
      fieldName: c.field_name,
      fieldType: c.field_type,
      label: c.label,
      displayOrder: c.display_order
    }));

    return {
      output: {
        institution: {
          code: institution.code,
          name: institution.name,
          mediumLogoUrl: institution.medium_logo_url,
          smallLogoUrl: institution.small_logo_url,
          url: institution.url,
          supportsAccountVerification: institution.supports_account_verification,
          supportsOauth: institution.supports_oauth,
          supportsTransactionHistory: institution.supports_transaction_history
        },
        credentials: mappedCreds
      },
      message: `Institution **${institution.name}** (${institution.code}). Requires ${mappedCreds.length} credential(s): ${mappedCreds.map((c: any) => c.label).join(', ')}.`
    };
  })
  .build();
