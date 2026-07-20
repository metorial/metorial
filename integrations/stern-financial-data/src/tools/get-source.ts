import { SlateTool } from 'slates';
import { z } from 'zod';
import { SternFinancialDataClient } from '../lib/client';
import { sternFinancialDataServiceError } from '../lib/errors';
import { applySourceFilters, type BetaFilters, type ErpFilters } from '../lib/filters';
import { normalizeSourceId, SOURCE_INPUT_IDS, type SourceId } from '../lib/sources';
import { spec } from '../spec';

let commonControls = {
  limit: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .default(25)
    .describe('Maximum rows to return when returnAll is false. Defaults to 25.'),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .describe('Number of filtered rows to skip.'),
  returnAll: z
    .boolean()
    .optional()
    .default(false)
    .describe('Return all filtered rows. Use sparingly because full Stern rows are wide.'),
  includeRaw: z
    .boolean()
    .optional()
    .default(false)
    .describe('Include original cell text in each returned row.')
};

let percentageDescription = 'Decimal percentage value; for example, 0.05 means 5%.';

let inputSchema = z.object({
  source: z
    .enum(SOURCE_INPUT_IDS)
    .describe(
      'Source id to retrieve. Prefer canonical ids erp, us_industry_betas, and global_industry_betas. Stern dataset aliases ctryprem and betas are also accepted for ERP and US industry betas.'
    ),
  ...commonControls,
  countries: z
    .array(z.string())
    .optional()
    .describe('ERP only. Exact country names to include, case-insensitive.'),
  countrySearch: z
    .string()
    .optional()
    .describe('ERP only. Case-insensitive substring search over country names.'),
  moodysRatings: z
    .array(z.string())
    .optional()
    .describe("ERP only. Moody's ratings to include, such as Aaa, Baa2, Caa1, or NR."),
  minEquityRiskPremium: z
    .number()
    .optional()
    .describe(`ERP only. Minimum equity risk premium. ${percentageDescription}`),
  maxEquityRiskPremium: z
    .number()
    .optional()
    .describe(`ERP only. Maximum equity risk premium. ${percentageDescription}`),
  minCountryRiskPremium: z
    .number()
    .optional()
    .describe(`ERP only. Minimum country risk premium. ${percentageDescription}`),
  maxCountryRiskPremium: z
    .number()
    .optional()
    .describe(`ERP only. Maximum country risk premium. ${percentageDescription}`),
  minCorporateTaxRate: z
    .number()
    .optional()
    .describe(`ERP only. Minimum corporate tax rate. ${percentageDescription}`),
  maxCorporateTaxRate: z
    .number()
    .optional()
    .describe(`ERP only. Maximum corporate tax rate. ${percentageDescription}`),
  hasSovereignCds: z
    .boolean()
    .optional()
    .describe('ERP only. Filter by whether the row has a sovereign CDS value.'),
  industries: z
    .array(z.string())
    .optional()
    .describe(
      'Industry beta sources only. Exact industry names to include, case-insensitive.'
    ),
  industrySearch: z
    .string()
    .optional()
    .describe(
      'Industry beta sources only. Case-insensitive substring search over industry names.'
    ),
  rowType: z
    .enum(['industry', 'aggregate'])
    .optional()
    .describe(
      'Industry beta sources only. Filter regular industry rows or total-market aggregate rows.'
    ),
  minBeta: z.number().optional().describe('Industry beta sources only. Minimum levered beta.'),
  maxBeta: z.number().optional().describe('Industry beta sources only. Maximum levered beta.'),
  minUnleveredBeta: z
    .number()
    .optional()
    .describe('Industry beta sources only. Minimum unlevered beta.'),
  maxUnleveredBeta: z
    .number()
    .optional()
    .describe('Industry beta sources only. Maximum unlevered beta.'),
  minNumberOfFirms: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Industry beta sources only. Minimum number of firms in the industry row.'),
  maxDebtToEquityRatio: z
    .number()
    .optional()
    .describe(
      `Industry beta sources only. Maximum debt-to-equity ratio. ${percentageDescription}`
    )
});

let outputSchema = z.object({
  metadata: z.object({
    source: z.string().describe('Source id that was retrieved.'),
    title: z.string().describe('Source title.'),
    pageUrl: z.string().describe('Stern HTML page URL.'),
    workbookUrl: z.string().describe('Stern workbook URL.'),
    retrievedAt: z.string().describe('ISO timestamp for this retrieval.'),
    sourceType: z
      .enum(['workbook', 'html'])
      .describe('Whether rows came from the workbook or HTML fallback.'),
    workbookFallbackReason: z
      .string()
      .optional()
      .describe('Reason workbook extraction fell back to HTML, when applicable.')
  }),
  totalRowCount: z.number().describe('Rows extracted before filtering.'),
  filteredRowCount: z.number().describe('Rows remaining after filters.'),
  returnedRowCount: z.number().describe('Rows returned in this response.'),
  offset: z.number().describe('Filtered-row offset applied.'),
  limit: z.number().nullable().describe('Row limit applied, or null when returnAll is true.'),
  returnAll: z.boolean().describe('Whether all filtered rows were requested.'),
  truncated: z.boolean().describe('Whether additional filtered rows were omitted.'),
  rows: z.array(z.any()).describe('Filtered Stern financial data rows.')
});

let validateRange = (min: number | undefined, max: number | undefined, label: string) => {
  if (min !== undefined && max !== undefined && min > max) {
    throw sternFinancialDataServiceError(`${label} minimum cannot be greater than maximum.`);
  }
};

type GetSourceInput = z.infer<typeof inputSchema>;
type GetSourceInputKey = keyof GetSourceInput;

let erpOnlyFilterKeys: GetSourceInputKey[] = [
  'countries',
  'countrySearch',
  'moodysRatings',
  'minEquityRiskPremium',
  'maxEquityRiskPremium',
  'minCountryRiskPremium',
  'maxCountryRiskPremium',
  'minCorporateTaxRate',
  'maxCorporateTaxRate',
  'hasSovereignCds'
];

let betaOnlyFilterKeys: GetSourceInputKey[] = [
  'industries',
  'industrySearch',
  'rowType',
  'minBeta',
  'maxBeta',
  'minUnleveredBeta',
  'maxUnleveredBeta',
  'minNumberOfFirms',
  'maxDebtToEquityRatio'
];

let rejectUnsupportedFilters = (
  input: GetSourceInput,
  keys: GetSourceInputKey[],
  filterGroup: string
) => {
  let providedKeys = keys.filter(key => input[key] !== undefined);

  if (providedKeys.length) {
    throw sternFinancialDataServiceError(
      `${filterGroup} filters are not supported for source "${input.source}": ${providedKeys.join(
        ', '
      )}.`
    );
  }
};

let validateInput = (input: GetSourceInput, sourceId: SourceId) => {
  if (sourceId === 'erp') {
    rejectUnsupportedFilters(input, betaOnlyFilterKeys, 'Industry beta');
    validateRange(input.minEquityRiskPremium, input.maxEquityRiskPremium, 'equityRiskPremium');
    validateRange(
      input.minCountryRiskPremium,
      input.maxCountryRiskPremium,
      'countryRiskPremium'
    );
    validateRange(input.minCorporateTaxRate, input.maxCorporateTaxRate, 'corporateTaxRate');
    return;
  }

  rejectUnsupportedFilters(input, erpOnlyFilterKeys, 'ERP');
  validateRange(input.minBeta, input.maxBeta, 'beta');
  validateRange(input.minUnleveredBeta, input.maxUnleveredBeta, 'unleveredBeta');
};

export let getSource = SlateTool.create(spec, {
  name: 'Get Source',
  key: 'get_source',
  description:
    'Retrieve a Stern financial data source and return filtered rows. Full output is available with returnAll=true, but use filters and limits when possible because full rows include many financial metrics and raw cell text can be large.',
  instructions: [
    'Call list_sources first when you need the available source ids, row fields, or filter hints.',
    'Use filters such as countrySearch, industrySearch, rating, beta, premium, and rowType before requesting full output.',
    'Set includeRaw only when original formatted cell text is needed for audit or display.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(inputSchema)
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let sourceId = normalizeSourceId(ctx.input.source);
    validateInput(ctx.input, sourceId);

    let client = new SternFinancialDataClient();
    let result = await client.getSource(sourceId);
    let sourceFilters = { ...ctx.input, source: sourceId };
    let paginated = applySourceFilters(
      sourceId,
      result.rows,
      sourceId === 'erp' ? (sourceFilters as ErpFilters) : (sourceFilters as BetaFilters)
    );

    return {
      output: {
        metadata: result.metadata,
        totalRowCount: paginated.totalRowCount,
        filteredRowCount: paginated.filteredRowCount,
        returnedRowCount: paginated.returnedRowCount,
        offset: ctx.input.offset,
        limit: ctx.input.returnAll ? null : ctx.input.limit,
        returnAll: ctx.input.returnAll,
        truncated: paginated.truncated,
        rows: paginated.returnedRows
      },
      message: `Retrieved **${paginated.returnedRowCount}** of **${paginated.filteredRowCount}** filtered Stern **${sourceId}** rows.`
    };
  })
  .build();
