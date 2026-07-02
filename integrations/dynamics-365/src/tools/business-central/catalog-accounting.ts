import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../spec';
import {
  type BusinessCentralContext,
  buildODataParams,
  compactRecord,
  companyInputFields,
  companyPath,
  containsFilter,
  createClient,
  dateFromFilter,
  dateToFilter,
  equalityFilter,
  listInputFields,
  numberValue,
  type ODataInput,
  pageOutputSchema,
  pageSummary,
  rawEqualityFilter,
  rawRecordSchema,
  resolveCompanyId,
  stringValue
} from './shared';

type ListContext = BusinessCentralContext & {
  input: BusinessCentralContext['input'] &
    ODataInput & {
      search?: string;
      category?: string;
      type?: string;
      updatedSince?: string;
      accountCategory?: string;
      accountType?: string;
      postingDateFrom?: string;
      postingDateTo?: string;
      accountId?: string;
      accountNumber?: string;
      searchField?: 'number' | 'code' | 'displayName';
      documentNumber?: string;
      templateDisplayName?: string;
    };
};

let itemSchema = z.object({
  id: z.string().optional(),
  number: z.string().optional(),
  displayName: z.string().optional(),
  type: z.string().optional(),
  itemCategoryId: z.string().optional(),
  itemCategoryCode: z.string().optional(),
  blocked: z.boolean().optional(),
  gtin: z.string().optional(),
  inventory: z.number().optional(),
  unitPrice: z.number().optional(),
  unitCost: z.number().optional(),
  priceIncludesTax: z.boolean().optional(),
  taxGroupId: z.string().optional(),
  taxGroupCode: z.string().optional(),
  baseUnitOfMeasureId: z.string().optional(),
  baseUnitOfMeasureCode: z.string().optional(),
  generalProductPostingGroupId: z.string().optional(),
  generalProductPostingGroupCode: z.string().optional(),
  inventoryPostingGroupId: z.string().optional(),
  inventoryPostingGroupCode: z.string().optional(),
  lastModifiedDateTime: z.string().optional(),
  record: rawRecordSchema
});

let accountSchema = z.object({
  id: z.string().optional(),
  number: z.string().optional(),
  displayName: z.string().optional(),
  category: z.string().optional(),
  subCategory: z.string().optional(),
  accountType: z.string().optional(),
  directPosting: z.boolean().optional(),
  incomeBalance: z.string().optional(),
  debitCreditBalance: z.string().optional(),
  blocked: z.boolean().optional(),
  netChange: z.number().optional(),
  totalBalance: z.number().optional(),
  balance: z.number().optional(),
  consolidationTranslationMethod: z.string().optional(),
  consolidationDebitAccount: z.string().optional(),
  consolidationCreditAccount: z.string().optional(),
  excludeFromConsolidation: z.boolean().optional(),
  lastModifiedDateTime: z.string().optional(),
  record: rawRecordSchema
});

let generalLedgerEntrySchema = z.object({
  id: z.string().optional(),
  entryNumber: z.number().optional(),
  postingDate: z.string().optional(),
  documentNumber: z.string().optional(),
  documentType: z.string().optional(),
  accountId: z.string().optional(),
  accountNumber: z.string().optional(),
  description: z.string().optional(),
  debitAmount: z.number().optional(),
  creditAmount: z.number().optional(),
  additionalCurrencyDebitAmount: z.number().optional(),
  additionalCurrencyCreditAmount: z.number().optional(),
  lastModifiedDateTime: z.string().optional(),
  record: rawRecordSchema
});

let journalSchema = z.object({
  id: z.string().optional(),
  code: z.string().optional(),
  displayName: z.string().optional(),
  templateDisplayName: z.string().optional(),
  balancingAccountId: z.string().optional(),
  balancingAccountNumber: z.string().optional(),
  lastModifiedDateTime: z.string().optional(),
  record: rawRecordSchema
});

let mapItem = (record: Record<string, unknown>) => ({
  ...compactRecord({
    id: stringValue(record, 'id'),
    number: stringValue(record, 'number'),
    displayName: stringValue(record, 'displayName'),
    type: stringValue(record, 'type'),
    itemCategoryId: stringValue(record, 'itemCategoryId'),
    itemCategoryCode: stringValue(record, 'itemCategoryCode'),
    blocked: typeof record.blocked === 'boolean' ? (record.blocked as boolean) : undefined,
    gtin: stringValue(record, 'gtin'),
    inventory: numberValue(record, 'inventory'),
    unitPrice: numberValue(record, 'unitPrice'),
    unitCost: numberValue(record, 'unitCost'),
    priceIncludesTax:
      typeof record.priceIncludesTax === 'boolean'
        ? (record.priceIncludesTax as boolean)
        : undefined,
    taxGroupId: stringValue(record, 'taxGroupId'),
    taxGroupCode: stringValue(record, 'taxGroupCode'),
    baseUnitOfMeasureId: stringValue(record, 'baseUnitOfMeasureId'),
    baseUnitOfMeasureCode: stringValue(record, 'baseUnitOfMeasureCode'),
    generalProductPostingGroupId: stringValue(record, 'generalProductPostingGroupId'),
    generalProductPostingGroupCode: stringValue(record, 'generalProductPostingGroupCode'),
    inventoryPostingGroupId: stringValue(record, 'inventoryPostingGroupId'),
    inventoryPostingGroupCode: stringValue(record, 'inventoryPostingGroupCode'),
    lastModifiedDateTime: stringValue(record, 'lastModifiedDateTime')
  }),
  record
});

let mapAccount = (record: Record<string, unknown>) => ({
  ...compactRecord({
    id: stringValue(record, 'id'),
    number: stringValue(record, 'number'),
    displayName: stringValue(record, 'displayName'),
    category: stringValue(record, 'category'),
    subCategory: stringValue(record, 'subCategory'),
    accountType: stringValue(record, 'accountType'),
    directPosting:
      typeof record.directPosting === 'boolean'
        ? (record.directPosting as boolean)
        : undefined,
    incomeBalance: stringValue(record, 'incomeBalance'),
    debitCreditBalance: stringValue(record, 'debitCreditBalance'),
    blocked: typeof record.blocked === 'boolean' ? (record.blocked as boolean) : undefined,
    netChange: numberValue(record, 'netChange'),
    totalBalance: numberValue(record, 'totalBalance'),
    balance: numberValue(record, 'balance'),
    consolidationTranslationMethod: stringValue(record, 'consolidationTranslationMethod'),
    consolidationDebitAccount: stringValue(record, 'consolidationDebitAccount'),
    consolidationCreditAccount: stringValue(record, 'consolidationCreditAccount'),
    excludeFromConsolidation:
      typeof record.excludeFromConsolidation === 'boolean'
        ? (record.excludeFromConsolidation as boolean)
        : undefined,
    lastModifiedDateTime: stringValue(record, 'lastModifiedDateTime')
  }),
  record
});

let mapGeneralLedgerEntry = (record: Record<string, unknown>) => ({
  ...compactRecord({
    id: stringValue(record, 'id'),
    entryNumber: numberValue(record, 'entryNumber'),
    postingDate: stringValue(record, 'postingDate'),
    documentNumber: stringValue(record, 'documentNumber'),
    documentType: stringValue(record, 'documentType'),
    accountId: stringValue(record, 'accountId'),
    accountNumber: stringValue(record, 'accountNumber'),
    description: stringValue(record, 'description'),
    debitAmount: numberValue(record, 'debitAmount'),
    creditAmount: numberValue(record, 'creditAmount'),
    additionalCurrencyDebitAmount: numberValue(record, 'additionalCurrencyDebitAmount'),
    additionalCurrencyCreditAmount: numberValue(record, 'additionalCurrencyCreditAmount'),
    lastModifiedDateTime: stringValue(record, 'lastModifiedDateTime')
  }),
  record
});

let mapJournal = (record: Record<string, unknown>) => ({
  ...compactRecord({
    id: stringValue(record, 'id'),
    code: stringValue(record, 'code'),
    displayName: stringValue(record, 'displayName'),
    templateDisplayName: stringValue(record, 'templateDisplayName'),
    balancingAccountId: stringValue(record, 'balancingAccountId'),
    balancingAccountNumber: stringValue(record, 'balancingAccountNumber'),
    lastModifiedDateTime: stringValue(record, 'lastModifiedDateTime')
  }),
  record
});

let nestedFilterSchemaVersionParams = (search: string | undefined) =>
  search?.trim() ? { $schemaversion: '2.1' } : {};

export let listItems = SlateTool.create(spec, {
  name: 'List Business Central Items',
  key: 'list_items',
  description:
    'List Business Central items and catalog records by search text, category, type, update timestamp, and OData filters.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...companyInputFields,
      ...listInputFields,
      search: z.string().optional().describe('Search item display name or number.'),
      category: z.string().optional().describe('Filter by upstream itemCategoryCode.'),
      type: z.string().optional().describe('Filter by upstream item type.'),
      updatedSince: z
        .string()
        .optional()
        .describe('Return items modified at or after this ISO timestamp.')
    })
  )
  .output(
    z.object({
      items: z.array(itemSchema).describe('Business Central item records.'),
      page: pageOutputSchema
    })
  )
  .handleInvocation(async rawCtx => {
    let ctx = rawCtx as ListContext;
    let client = createClient(ctx);
    let companyId = resolveCompanyId(ctx);
    let { params, page } = buildODataParams(ctx, ctx.input, [
      containsFilter(['displayName', 'number'], ctx.input.search),
      equalityFilter('itemCategoryCode', ctx.input.category),
      equalityFilter('type', ctx.input.type),
      dateFromFilter('lastModifiedDateTime', ctx.input.updatedSince)
    ]);
    Object.assign(params, nestedFilterSchemaVersionParams(ctx.input.search));
    let response = await client.getList<Record<string, unknown>>(
      'list items',
      `/${companyPath(companyId)}/items`,
      params
    );
    let items = response.value!.map(mapItem);

    return {
      output: {
        items,
        page: pageSummary(response, page)
      },
      message: `Found **${items.length}** Business Central item record(s).`
    };
  })
  .build();

export let listAccounts = SlateTool.create(spec, {
  name: 'List Business Central Accounts',
  key: 'list_accounts',
  description:
    'List Business Central chart-of-accounts rows by search text, account category, account type, and OData filters.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...companyInputFields,
      ...listInputFields,
      search: z
        .string()
        .optional()
        .describe(
          'Search one account text field. Defaults to account number; set searchField to displayName to search account names.'
        ),
      searchField: z
        .enum(['number', 'displayName'])
        .optional()
        .describe('Account field searched by search. Defaults to number.'),
      accountCategory: z.string().optional().describe('Filter by upstream account category.'),
      accountType: z.string().optional().describe('Filter by upstream account type.')
    })
  )
  .output(
    z.object({
      accounts: z.array(accountSchema).describe('Business Central chart of accounts rows.'),
      page: pageOutputSchema
    })
  )
  .handleInvocation(async rawCtx => {
    let ctx = rawCtx as ListContext;
    let client = createClient(ctx);
    let companyId = resolveCompanyId(ctx);
    let searchField = ctx.input.searchField ?? 'number';
    let { params, page } = buildODataParams(ctx, ctx.input, [
      containsFilter([searchField], ctx.input.search),
      equalityFilter('category', ctx.input.accountCategory),
      equalityFilter('accountType', ctx.input.accountType)
    ]);
    Object.assign(params, nestedFilterSchemaVersionParams(ctx.input.search));
    let response = await client.getList<Record<string, unknown>>(
      'list accounts',
      `/${companyPath(companyId)}/accounts`,
      params
    );
    let accounts = response.value!.map(mapAccount);

    return {
      output: {
        accounts,
        page: pageSummary(response, page)
      },
      message: `Found **${accounts.length}** Business Central account record(s).`
    };
  })
  .build();

export let listGeneralLedgerEntries = SlateTool.create(spec, {
  name: 'List Business Central General Ledger Entries',
  key: 'list_general_ledger_entries',
  description:
    'List Business Central posted general ledger entries by posting date range, account, document number, and OData filters.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...companyInputFields,
      ...listInputFields,
      postingDateFrom: z.string().optional().describe('Minimum postingDate.'),
      postingDateTo: z.string().optional().describe('Maximum postingDate.'),
      accountId: z.string().optional().describe('Filter by Business Central account GUID.'),
      accountNumber: z.string().optional().describe('Filter by account number.'),
      documentNumber: z.string().optional().describe('Filter by document number.')
    })
  )
  .output(
    z.object({
      generalLedgerEntries: z
        .array(generalLedgerEntrySchema)
        .describe('Business Central general ledger entries.'),
      page: pageOutputSchema
    })
  )
  .handleInvocation(async rawCtx => {
    let ctx = rawCtx as ListContext;
    let client = createClient(ctx);
    let companyId = resolveCompanyId(ctx);
    let { params, page } = buildODataParams(ctx, ctx.input, [
      dateFromFilter('postingDate', ctx.input.postingDateFrom),
      dateToFilter('postingDate', ctx.input.postingDateTo),
      rawEqualityFilter('accountId', ctx.input.accountId),
      equalityFilter('accountNumber', ctx.input.accountNumber),
      equalityFilter('documentNumber', ctx.input.documentNumber)
    ]);
    let response = await client.getList<Record<string, unknown>>(
      'list general ledger entries',
      `/${companyPath(companyId)}/generalLedgerEntries`,
      params
    );
    let generalLedgerEntries = response.value!.map(mapGeneralLedgerEntry);

    return {
      output: {
        generalLedgerEntries,
        page: pageSummary(response, page)
      },
      message: `Found **${generalLedgerEntries.length}** Business Central general ledger entr${
        generalLedgerEntries.length === 1 ? 'y' : 'ies'
      }.`
    };
  })
  .build();

export let listJournals = SlateTool.create(spec, {
  name: 'List Business Central Journals',
  key: 'list_journals',
  description:
    'List Business Central journals by one selected search field, template display name, and OData filters.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...companyInputFields,
      ...listInputFields,
      search: z
        .string()
        .optional()
        .describe('Search one journal text field. Defaults to code.'),
      searchField: z
        .enum(['code', 'displayName'])
        .optional()
        .describe('Journal field searched by search. Defaults to code.'),
      templateDisplayName: z.string().optional().describe('Filter by template display name.')
    })
  )
  .output(
    z.object({
      journals: z.array(journalSchema).describe('Business Central journals.'),
      page: pageOutputSchema
    })
  )
  .handleInvocation(async rawCtx => {
    let ctx = rawCtx as ListContext;
    let client = createClient(ctx);
    let companyId = resolveCompanyId(ctx);
    let searchField = ctx.input.searchField ?? 'code';
    let { params, page } = buildODataParams(ctx, ctx.input, [
      containsFilter([searchField], ctx.input.search),
      equalityFilter('templateDisplayName', ctx.input.templateDisplayName)
    ]);
    Object.assign(params, nestedFilterSchemaVersionParams(ctx.input.search));
    let response = await client.getList<Record<string, unknown>>(
      'list journals',
      `/${companyPath(companyId)}/journals`,
      params
    );
    let journals = response.value!.map(mapJournal);

    return {
      output: {
        journals,
        page: pageSummary(response, page)
      },
      message: `Found **${journals.length}** Business Central journal record(s).`
    };
  })
  .build();
