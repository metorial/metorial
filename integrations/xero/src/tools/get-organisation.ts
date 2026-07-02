import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

export let getOrganisation = SlateTool.create(spec, {
  name: 'Get Organisation',
  key: 'get_organisation',
  description: `Retrieves details about the connected Xero organisation, including name, legal name, country, currency, tax settings, financial year dates, and timezone. Useful for understanding the organisation's configuration.`,
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      organisationId: z.string().optional().describe('Organisation ID'),
      name: z.string().optional().describe('Organisation name'),
      legalName: z.string().optional().describe('Legal name'),
      organisationType: z.string().optional().describe('Organisation type'),
      baseCurrency: z.string().optional().describe('Base currency code'),
      countryCode: z.string().optional().describe('Country code'),
      isDemoCompany: z.boolean().optional().describe('Whether this is a demo company'),
      organisationStatus: z.string().optional().describe('Organisation status'),
      financialYearEndDay: z.number().optional().describe('Financial year end day'),
      financialYearEndMonth: z.number().optional().describe('Financial year end month'),
      salesTaxBasis: z
        .string()
        .optional()
        .describe('Sales tax basis: PAYMENTS, INVOICE, NONE'),
      salesTaxPeriod: z.string().optional().describe('Sales tax period'),
      defaultSalesTax: z.string().optional().describe('Default sales tax type'),
      defaultPurchasesTax: z.string().optional().describe('Default purchases tax type'),
      timezone: z.string().optional().describe('Organisation timezone'),
      shortCode: z.string().optional().describe('Short code for the organisation'),
      edition: z.string().optional().describe('Xero edition'),
      lineOfBusiness: z.string().optional().describe('Line of business'),
      createdDate: z.string().optional().describe('Organisation creation date')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let org = await client.getOrganisation();

    let output = {
      organisationId: org.OrganisationID,
      name: org.Name,
      legalName: org.LegalName,
      organisationType: org.OrganisationType,
      baseCurrency: org.BaseCurrency,
      countryCode: org.CountryCode,
      isDemoCompany: org.IsDemoCompany,
      organisationStatus: org.OrganisationStatus,
      financialYearEndDay: org.FinancialYearEndDay,
      financialYearEndMonth: org.FinancialYearEndMonth,
      salesTaxBasis: org.SalesTaxBasis,
      salesTaxPeriod: org.SalesTaxPeriod,
      defaultSalesTax: org.DefaultSalesTax,
      defaultPurchasesTax: org.DefaultPurchasesTax,
      timezone: org.Timezone,
      shortCode: org.ShortCode,
      edition: org.Edition,
      lineOfBusiness: org.LineOfBusiness,
      createdDate: org.CreatedDateUTC
    };

    return {
      output,
      message: `Organisation: **${output.name}**${output.legalName ? ` (${output.legalName})` : ''} — ${output.countryCode}, ${output.baseCurrency}, ${output.edition || 'Standard'} edition.`
    };
  })
  .build();
