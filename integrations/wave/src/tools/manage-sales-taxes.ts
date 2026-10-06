import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { WaveClient } from '../lib/client';
import type { SalesTax } from '../lib/contracts';
import { decimalNumber } from '../lib/validation';
import { spec } from '../spec';

let salesTaxOutputSchema = z.object({
  salesTaxId: z.string().describe('Unique identifier of the sales tax'),
  name: z.string().describe('Sales tax name'),
  abbreviation: z.string().optional().describe('Short abbreviation (e.g., "GST", "HST")'),
  description: z.string().optional().describe('Sales tax description'),
  taxNumber: z.string().optional().describe('Tax registration number'),
  rate: z.number().optional().describe('Current tax rate (percentage)'),
  isCompound: z.boolean().optional().describe('Whether this is a compound tax'),
  isRecoverable: z.boolean().optional().describe('Whether this tax is recoverable'),
  isArchived: z.boolean().optional().describe('Whether the sales tax is archived'),
  rates: z
    .array(
      z.object({
        effective: z.string().optional().describe('Effective date of the rate'),
        rate: z.number().optional().describe('Tax rate percentage')
      })
    )
    .optional()
    .describe('Historical rate changes with effective dates'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  modifiedAt: z.string().optional().describe('Last modification timestamp')
});

let mapSalesTax = (t: SalesTax) => ({
  salesTaxId: t.id,
  name: t.name,
  abbreviation: t.abbreviation,
  description: t.description,
  taxNumber: t.taxNumber,
  rate: decimalNumber(t.rate, 2),
  isCompound: t.isCompound,
  isRecoverable: t.isRecoverable,
  isArchived: t.isArchived,
  rates: t.rates.map(rate => ({
    effective: rate.effective,
    rate: decimalNumber(rate.rate, 2)
  })),
  createdAt: t.createdAt,
  modifiedAt: t.modifiedAt
});

// --- List Sales Taxes ---

export let listSalesTaxes = SlateTool.create(spec, {
  name: 'List Sales Taxes',
  key: 'list_sales_taxes',
  description: `List sales tax entries for a Wave business. Returns tax details including current rates, historical rate changes, and configuration.`,
  tags: {
    readOnly: true
  }
})
  .scopes(anyOf('sales_tax:read'))
  .input(
    z.object({
      businessId: z
        .string()
        .describe(
          'ID of the business to list sales taxes for. Call list_businesses to discover a permitted business ID.'
        ),
      page: z.number().optional().describe('Page number (starts at 1, default: 1)'),
      pageSize: z.number().optional().describe('Number of results per page (default: 20)')
    })
  )
  .output(
    z.object({
      salesTaxes: z.array(salesTaxOutputSchema).describe('List of sales taxes'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages'),
      totalCount: z.number().describe('Total number of sales taxes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WaveClient(ctx.auth.token);
    let result = await client.listSalesTaxes(
      ctx.input.businessId,
      ctx.input.page ?? 1,
      ctx.input.pageSize ?? 20
    );

    return {
      output: {
        salesTaxes: result.items.map(mapSalesTax),
        currentPage: result.pageInfo.currentPage,
        totalPages: result.pageInfo.totalPages,
        totalCount: result.pageInfo.totalCount
      },
      message: `Found **${result.pageInfo.totalCount}** sales taxes (page ${result.pageInfo.currentPage} of ${result.pageInfo.totalPages}).`
    };
  })
  .build();

// --- Create Sales Tax ---

export let createSalesTax = SlateTool.create(spec, {
  name: 'Create Sales Tax',
  key: 'create_sales_tax',
  tags: { readOnly: false },
  description: `Create a new sales tax entry for a Wave business. Configure the tax rate, abbreviation, and whether it is compound or recoverable.`
})
  .scopes(anyOf('sales_tax:write'))
  .input(
    z.object({
      businessId: z
        .string()
        .describe(
          'ID of the business to create the sales tax for. Call list_businesses to discover a permitted business ID.'
        ),
      name: z.string().describe('Sales tax name (e.g., "State Sales Tax")'),
      abbreviation: z.string().describe('Short abbreviation (e.g., "GST", "HST", "VAT")'),
      rate: z.number().describe('Tax rate as a percentage (e.g., 13 for 13%)'),
      description: z.string().optional().describe('Sales tax description'),
      taxNumber: z.string().optional().describe('Tax registration number'),
      isCompound: z
        .boolean()
        .optional()
        .describe('Whether this is a compound tax (applied on top of other taxes)'),
      isRecoverable: z.boolean().optional().describe('Whether this tax is recoverable')
    })
  )
  .output(salesTaxOutputSchema)
  .handleInvocation(async ctx => {
    let client = new WaveClient(ctx.auth.token);
    let result = await client.createSalesTax(ctx.input);

    return {
      output: mapSalesTax(result.data),
      message: `Created sales tax **${result.data.name}** (${result.data.abbreviation}) at ${decimalNumber(result.data.rate, 2)}%.`
    };
  })
  .build();

// --- Update Sales Tax ---

export let updateSalesTax = SlateTool.create(spec, {
  name: 'Update Sales Tax',
  key: 'update_sales_tax',
  tags: { readOnly: false },
  description: `Update an existing sales tax entry's details. Only the fields you provide will be updated; omitted fields remain unchanged. To change rates, provide the documented effective-date rates array in percentage units.`,
  instructions: [
    'Supply rates with effective dates to update the documented rate schedule. The rates use percentage units, such as 5 for 5%.'
  ]
})
  .scopes(anyOf('sales_tax:write'))
  .input(
    z.object({
      salesTaxId: z.string().describe('ID of the sales tax to update'),
      rates: z
        .array(
          z.object({
            effective: z.string().describe('Effective date (YYYY-MM-DD).'),
            rate: z
              .number()
              .describe(
                'Rate as a percentage, such as 5 for 5%; at most four percentage decimal places.'
              )
          })
        )
        .optional()
        .describe(
          'Documented effective-date rate schedule. Omit to keep current rates; supplied rates affect tax calculations.'
        ),
      name: z.string().optional().describe('Updated sales tax name'),
      abbreviation: z.string().optional().describe('Updated abbreviation'),
      description: z.string().optional().describe('Updated description'),
      taxNumber: z.string().optional().describe('Updated tax registration number'),
      isCompound: z
        .boolean()
        .optional()
        .describe('Legacy field unsupported by tax updates; omit it.'),
      isRecoverable: z
        .boolean()
        .optional()
        .describe('Legacy field unsupported by tax updates; omit it.')
    })
  )
  .output(salesTaxOutputSchema)
  .handleInvocation(async ctx => {
    let client = new WaveClient(ctx.auth.token);
    let { salesTaxId, ...rest } = ctx.input;
    let result = await client.patchSalesTax({ id: salesTaxId, ...rest });

    return {
      output: mapSalesTax(result.data),
      message: `Updated sales tax **${result.data.name}**.`
    };
  })
  .build();

// --- Archive Sales Tax ---

export let archiveSalesTax = SlateTool.create(spec, {
  name: 'Archive Sales Tax',
  key: 'archive_sales_tax',
  tags: { readOnly: false, destructive: true },
  description: `Archive a sales tax entry. Archived sales taxes are hidden from active listings but are not deleted.`
})
  .scopes(anyOf('sales_tax:write'))
  .input(
    z.object({
      salesTaxId: z.string().describe('ID of the sales tax to archive')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the archival was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WaveClient(ctx.auth.token);
    await client.archiveSalesTax(ctx.input.salesTaxId);

    return {
      output: { success: true },
      message: `Archived sales tax \`${ctx.input.salesTaxId}\`.`
    };
  })
  .build();
