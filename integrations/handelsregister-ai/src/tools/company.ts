import { SlateTool } from 'slates';
import { z } from 'zod';
import { HandelsregisterClient, readMeta } from '../lib/client';
import { statementFiles, websiteFiles } from '../lib/files';
import { baseCompany, parseResponse } from '../lib/response';
import {
  companyInputSchema,
  companySchema,
  fileSchema,
  financialKpiSchema,
  metaSchema,
  recordSchema
} from '../lib/schemas';
import { spec } from '../spec';

const companyOutput = { company: companySchema, meta: metaSchema.optional() };
const constraints = [
  'Each request costs 5 base credits plus the selected feature when data is returned. AI mode adds 20 credits even on failure; realtime adds 10 on success. Requests are not automatically retried.'
];

export const companyOverviewTool = SlateTool.create(spec, {
  key: 'get_company_overview',
  name: 'Get Company Overview',
  description:
    'Get core German company registry information: identity, address, registration, status, purpose, contact details, and capital. Use search_organizations to distinguish similar company names.',
  tags: { readOnly: true },
  constraints
})
  .input(companyInputSchema)
  .output(z.object(companyOutput))
  .handleInvocation(async ctx => {
    let response = await new HandelsregisterClient(ctx.auth).organization(ctx.input);
    return {
      output: { company: baseCompany(response), meta: readMeta(response.meta) },
      message: 'Retrieved the company overview.'
    };
  })
  .build();

function featureTool(
  key: string,
  name: string,
  feature: string,
  description: string,
  dataSchema: z.ZodType,
  responseKey = feature
) {
  return SlateTool.create(spec, {
    key,
    name,
    description,
    tags: { readOnly: true },
    constraints
  })
    .input(companyInputSchema)
    .output(z.object({ ...companyOutput, data: dataSchema.nullish() }))
    .handleInvocation(async ctx => {
      let response = await new HandelsregisterClient(ctx.auth).organization(
        ctx.input,
        feature
      );
      return {
        output: {
          company: baseCompany(response),
          meta: readMeta(response.meta),
          data: parseResponse(dataSchema.nullish(), response[responseKey])
        },
        message: `Retrieved ${name.toLowerCase()} for the company.`
      };
    })
    .build();
}

export const companyDataTools = [
  featureTool(
    'get_financials',
    'Get Financials',
    'financial_kpi',
    'Get yearly financial KPIs such as revenue, net income, assets, and employees. For detailed account trees use get_balance_sheet or get_profit_and_loss. Feature costs 1 credit.',
    z.array(financialKpiSchema)
  ),
  featureTool(
    'get_balance_sheet',
    'Get Balance Sheet',
    'balance_sheet_accounts',
    'Get detailed hierarchical balance-sheet accounts by fiscal year. Feature costs 3 credits.',
    z.array(
      z
        .object({ year: z.number(), balance_sheet_accounts: z.array(recordSchema).optional() })
        .catchall(z.unknown())
    )
  ),
  featureTool(
    'get_profit_and_loss',
    'Get Profit and Loss',
    'profit_and_loss_account',
    'Get detailed hierarchical profit-and-loss accounts by fiscal year, including revenue, expenses, and profit. Feature costs 3 credits.',
    z.array(
      z
        .object({
          year: z.number(),
          profit_and_loss_accounts: z.array(recordSchema).optional()
        })
        .catchall(z.unknown())
    )
  ),
  featureTool(
    'get_related_persons',
    'Get Related Persons',
    'related_persons',
    'Get current and former company directors and officers with roles and tenures. Cannot use realtime_mode. Feature costs 2 credits.',
    z
      .object({
        current: z.array(recordSchema).nullish(),
        past: z.array(recordSchema).nullish()
      })
      .catchall(z.unknown())
  ),
  featureTool(
    'get_shareholders',
    'Get Shareholders',
    'shareholders',
    'Get direct company shareholders, ownership percentages, contributions, and historical lists. For ultimate owners use get_ubos. Beta feature costs 5 credits.',
    recordSchema
  ),
  featureTool(
    'get_ubos',
    'Get Ultimate Beneficial Owners',
    'ubos',
    'Get ultimate beneficial owners, ownership paths, unresolved owners, and coverage metrics. Beta feature costs 10 credits.',
    recordSchema
  ),
  featureTool(
    'get_shareholdings',
    'Get Company Shareholdings',
    'shareholdings',
    'Get this company’s holdings in other companies. For people’s holdings use fetch_person. Beta feature costs 5 credits.',
    recordSchema
  ),
  featureTool(
    'get_mergers_and_acquisitions',
    'Get Mergers and Acquisitions',
    'mergers_and_acquisitions',
    'Get company mergers, splits, enterprise agreements, counterparties, control relationships, and transaction summary. Beta feature costs 20 credits.',
    z
      .object({
        transactions: z.array(recordSchema).nullish(),
        summary: recordSchema.nullish()
      })
      .catchall(z.unknown())
  ),
  featureTool(
    'get_publications',
    'Get Register Publications',
    'publications',
    'Get official register announcements and structured company events from publication history. Cannot use realtime_mode. Feature costs 1 credit.',
    z.array(recordSchema),
    'history'
  ),
  featureTool(
    'get_insolvency_publications',
    'Get Insolvency Publications',
    'insolvency_publications',
    'Get insolvency court publications including dates, case numbers, and notices. An empty result is valid when none are available. Feature costs 5 credits.',
    z.array(recordSchema)
  ),
  featureTool(
    'get_news',
    'Get Company News',
    'news',
    'Get recent company news with titles, sources, publication dates, and source URLs. Feature costs 10 credits.',
    z.array(
      z
        .object({
          title: z.string().optional(),
          url: z.string().nullish(),
          source: z.string().nullish(),
          publication_date: z.string().nullish()
        })
        .catchall(z.unknown())
    )
  )
];

function annualStatementsTool(html: boolean) {
  let feature = html ? 'annual_financial_statements__html' : 'annual_financial_statements';
  return SlateTool.create(spec, {
    key: html ? 'get_annual_financial_statements_html' : 'get_annual_financial_statements',
    name: html
      ? 'Download Annual Statements as HTML'
      : 'Download Annual Statements as Markdown',
    description: `Download complete annual financial statements as ${html ? 'HTML' : 'Markdown'} files, with fiscal year, title, and publication metadata. For numeric KPIs use get_financials. Feature costs 5 credits.`,
    tags: { readOnly: true },
    constraints
  })
    .input(companyInputSchema)
    .output(z.object({ ...companyOutput, files: z.array(fileSchema) }))
    .handleInvocation(async ctx => {
      let response = await new HandelsregisterClient(ctx.auth).organization(
        ctx.input,
        feature
      );
      let company = baseCompany(response);
      let value =
        response[feature] ?? (html ? response.annual_financial_statements_html : undefined);
      let { files, attachments } = statementFiles(value, html, company.entity_id);
      return {
        output: { company, meta: readMeta(response.meta), files },
        attachments,
        message: attachments.length
          ? `Annual statements for **${company.name}** are ready to download.`
          : `No downloadable annual statements were returned for **${company.name}**.`
      };
    })
    .build();
}

export const annualStatementTools = [annualStatementsTool(false), annualStatementsTool(true)];
export const websiteContentTool = SlateTool.create(spec, {
  key: 'get_website_content',
  name: 'Get Company Website Content',
  description:
    'Retrieve the company website as a downloadable Markdown file. Always enables AI mode: 5 base credits plus 20 AI credits; website content itself costs 0 credits.',
  tags: { readOnly: true },
  constraints
})
  .input(companyInputSchema)
  .output(z.object({ ...companyOutput, files: z.array(fileSchema) }))
  .handleInvocation(async ctx => {
    let response = await new HandelsregisterClient(ctx.auth).organization(
      ctx.input,
      'website_content'
    );
    let company = baseCompany(response);
    let { files, attachments } = websiteFiles(response.website_content, company.entity_id);
    return {
      output: { company, meta: readMeta(response.meta), files },
      message: attachments.length
        ? 'Company website Markdown is ready to download.'
        : 'No website content was returned.',
      attachments
    };
  })
  .build();
