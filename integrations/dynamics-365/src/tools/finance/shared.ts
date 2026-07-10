import {
  createDynamicsFinOpsClient,
  dynamicsFinOpsServiceError,
  FINOPS_DEFAULT_PAGE_SIZE,
  type FinOpsODataQuery,
  resolveFinOpsInputLegalEntity
} from '@slates/dynamics-finops-recipes';
import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../spec';

type FinOpsAuthContext = {
  finOpsToken?: string;
  finOpsBaseUrl?: string;
};

type FinOpsConfigContext = {
  finOpsBaseUrl?: string;
  finOpsDefaultLegalEntity?: string;
  finOpsDefaultPageSize?: number;
  finOpsDefaultMaxPages?: number;
};

type FinOpsInputContext = {
  finOpsBaseUrl?: string;
  entitySetName?: string;
  legalEntity?: string;
  dataAreaId?: string;
  crossCompany?: boolean;
  limit?: number;
  skip?: number;
  select?: string[];
  filter?: string;
  orderBy?: string[];
  expand?: string[];
  count?: boolean;
  maxPages?: number;
  keyValues?: Record<string, unknown>;
  record?: Record<string, unknown>;
};

export type FinOpsToolContext = {
  auth: FinOpsAuthContext;
  config?: FinOpsConfigContext;
  input: FinOpsInputContext;
};

export type FinOpsResourceDefinition = {
  key: string;
  name: string;
  description: string;
  outputKey: string;
  entitySetName: string;
  companyScoped?: boolean;
  idFields?: string[];
  numberFields?: string[];
  nameFields?: string[];
  statusFields?: string[];
  dateFields?: string[];
  amountFields?: string[];
  currencyFields?: string[];
};

let connectionInputFields = {
  finOpsBaseUrl: z
    .string()
    .optional()
    .describe('Override Finance and Operations environment URL for this request.')
};

let queryInputFields = {
  ...connectionInputFields,
  entitySetName: z
    .string()
    .optional()
    .describe('Override the default Finance and Operations public OData entity set name.'),
  legalEntity: z.string().optional().describe('Legal entity / dataAreaId filter value.'),
  dataAreaId: z.string().optional().describe('Alias for legalEntity.'),
  crossCompany: z.boolean().optional().describe('Query across legal entities.'),
  limit: z.number().int().min(1).max(10000).optional().describe('Maximum records to return.'),
  skip: z.number().int().min(0).optional().describe('OData $skip value.'),
  select: z.array(z.string()).optional().describe('OData $select fields.'),
  filter: z.string().optional().describe('Advanced OData $filter expression.'),
  orderBy: z.array(z.string()).optional().describe('OData $orderby field directions.'),
  expand: z.array(z.string()).optional().describe('OData $expand navigation properties.'),
  count: z.boolean().optional().describe('Request OData @odata.count.'),
  maxPages: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum number of OData pages to fetch.')
};

let keyInputFields = {
  ...connectionInputFields,
  entitySetName: z
    .string()
    .optional()
    .describe('Override the default Finance and Operations public OData entity set name.'),
  keyValues: z
    .record(z.string(), z.unknown())
    .describe('OData key values keyed by property name, including dataAreaId when required.'),
  select: z.array(z.string()).optional().describe('OData $select fields.'),
  expand: z.array(z.string()).optional().describe('OData $expand navigation properties.')
};

let createInputFields = {
  ...connectionInputFields,
  entitySetName: z
    .string()
    .optional()
    .describe('Override the default Finance and Operations public OData entity set name.'),
  record: z
    .record(z.string(), z.unknown())
    .describe(
      'Draft data entity record payload. Include dataAreaId when the entity requires it.'
    )
};

export let rawRecordSchema = z
  .record(z.string(), z.unknown())
  .describe('Raw Finance and Operations OData record for fields not normalized by this tool.');

let finOpsRecordSchema = z.object({
  id: z.string().optional(),
  number: z.string().optional(),
  name: z.string().optional(),
  displayName: z.string().optional(),
  status: z.string().optional(),
  legalEntity: z.string().optional(),
  date: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  record: rawRecordSchema
});

let pageOutputSchema = z.object({
  count: z.number().describe('Number of records returned.'),
  requestedLimit: z.number().describe('Requested page size.'),
  pagesFetched: z.number().describe('Number of OData pages fetched.'),
  truncated: z.boolean().describe('Whether additional pages were left unfetched.'),
  nextLink: z.string().optional().describe('Raw OData nextLink when present.')
});

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let resolveBaseUrl = (ctx: FinOpsToolContext) => {
  let baseUrl = ctx.input.finOpsBaseUrl ?? ctx.config?.finOpsBaseUrl ?? ctx.auth.finOpsBaseUrl;

  if (!baseUrl) {
    throw dynamicsFinOpsServiceError('Finance and Operations finOpsBaseUrl is required.');
  }

  return baseUrl;
};

let requireFinOpsToken = (ctx: FinOpsToolContext) => {
  if (!ctx.auth.finOpsToken?.trim()) {
    throw dynamicsFinOpsServiceError(
      'Finance and Operations tools require finOpsToken from oauth_common, oauth_organizations, or microsoft_client_credentials auth.'
    );
  }

  return ctx.auth.finOpsToken;
};

let createClient = (
  ctx: FinOpsToolContext,
  options: {
    includeDefaultLegalEntity?: boolean;
  } = {}
) =>
  createDynamicsFinOpsClient({
    auth: {
      token: requireFinOpsToken(ctx)
    },
    config: {
      baseUrl: resolveBaseUrl(ctx),
      defaultLegalEntity:
        options.includeDefaultLegalEntity === false
          ? undefined
          : ctx.config?.finOpsDefaultLegalEntity
    }
  });

let resolveEntitySetName = (
  input: string | undefined,
  definition: FinOpsResourceDefinition
) => {
  let entitySetName = input?.trim() || definition.entitySetName;
  if (!entitySetName) {
    throw dynamicsFinOpsServiceError(`${definition.name} entitySetName is required.`);
  }

  return entitySetName;
};

let buildQuery = (
  ctx: FinOpsToolContext,
  definition: FinOpsResourceDefinition
): FinOpsODataQuery => {
  let explicitLegalEntity = resolveFinOpsInputLegalEntity(ctx.input, definition);
  let finOpsDefaultLegalEntity =
    definition.companyScoped && ctx.input.crossCompany !== true
      ? ctx.config?.finOpsDefaultLegalEntity
      : undefined;
  let legalEntity = definition.companyScoped
    ? (explicitLegalEntity ?? finOpsDefaultLegalEntity)
    : ctx.input.legalEntity;
  let crossCompany =
    definition.companyScoped && legalEntity
      ? (ctx.input.crossCompany ?? true)
      : ctx.input.crossCompany;

  return {
    select: ctx.input.select,
    filter: ctx.input.filter,
    orderBy: ctx.input.orderBy,
    expand: ctx.input.expand,
    top: ctx.input.limit ?? ctx.config?.finOpsDefaultPageSize,
    skip: ctx.input.skip,
    count: ctx.input.count,
    crossCompany,
    legalEntity,
    dataAreaId: definition.companyScoped && legalEntity ? undefined : ctx.input.dataAreaId
  };
};

let firstString = (record: Record<string, unknown>, fields: string[]) => {
  for (let field of fields) {
    let value = record[field];
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }

  return undefined;
};

let firstNumber = (record: Record<string, unknown>, fields: string[]) => {
  for (let field of fields) {
    let value = record[field];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }

  return undefined;
};

let mapRecord = (definition: FinOpsResourceDefinition, record: Record<string, unknown>) => ({
  ...pickDefined({
    id: firstString(record, [...(definition.idFields ?? []), 'RecId', 'RecordId', 'Id', 'id']),
    number: firstString(record, [
      ...(definition.numberFields ?? []),
      'AccountNum',
      'AccountNumber',
      'JournalBatchNumber',
      'InvoiceNumber',
      'Voucher',
      'DocumentNumber',
      'Number'
    ]),
    name: firstString(record, [
      ...(definition.nameFields ?? []),
      'Name',
      'name',
      'Description'
    ]),
    displayName: firstString(record, [
      'DisplayName',
      'displayName',
      'NameAlias',
      ...(definition.nameFields ?? [])
    ]),
    status: firstString(record, [
      ...(definition.statusFields ?? []),
      'Status',
      'DocumentStatus',
      'ApprovalStatus',
      'InvoiceStatus'
    ]),
    legalEntity: firstString(record, [
      'dataAreaId',
      'DataAreaId',
      'LegalEntityId',
      'Company',
      'CompanyId'
    ]),
    date: firstString(record, [
      ...(definition.dateFields ?? []),
      'AccountingDate',
      'TransDate',
      'InvoiceDate',
      'DocumentDate',
      'CreatedDateTime'
    ]),
    amount: firstNumber(record, [
      ...(definition.amountFields ?? []),
      'AmountCur',
      'AmountMST',
      'DebitAmount',
      'CreditAmount',
      'InvoiceAmount'
    ]),
    currency: firstString(record, [
      ...(definition.currencyFields ?? []),
      'CurrencyCode',
      'TransactionCurrencyCode',
      'Currency'
    ])
  }),
  record
});

let assertRecords = (items: unknown[], operation: string) =>
  items.map((item, index) => {
    if (!isRecord(item)) {
      throw dynamicsFinOpsServiceError(
        `${operation} returned a non-object record at index ${index}.`,
        'dynamics_finops_response'
      );
    }

    return item;
  });

export let createListRecordsTool = (definition: FinOpsResourceDefinition) =>
  SlateTool.create(spec, {
    name: definition.name,
    key: definition.key,
    description: definition.description,
    tags: {
      destructive: false,
      readOnly: true
    }
  })
    .input(z.object(queryInputFields))
    .output(
      z.object({
        [definition.outputKey]: z.array(finOpsRecordSchema),
        entitySetName: z.string(),
        page: pageOutputSchema
      })
    )
    .handleInvocation(async rawCtx => {
      let ctx = rawCtx as FinOpsToolContext;
      let client = createClient(ctx, { includeDefaultLegalEntity: true });
      let entitySetName = resolveEntitySetName(ctx.input.entitySetName, definition);
      let requestedLimit =
        ctx.input.limit ?? ctx.config?.finOpsDefaultPageSize ?? FINOPS_DEFAULT_PAGE_SIZE;
      let result = await client.listDataEntityAll<Record<string, unknown>>(
        entitySetName,
        buildQuery(ctx, definition),
        {
          maxPages: ctx.input.maxPages ?? ctx.config?.finOpsDefaultMaxPages,
          pageSize: requestedLimit,
          maxItems: ctx.input.limit,
          dataAreaIdField: definition.companyScoped ? undefined : false
        }
      );
      let records = assertRecords(result.items, definition.name).map(record =>
        mapRecord(definition, record)
      );

      return {
        output: {
          [definition.outputKey]: records,
          entitySetName,
          page: {
            count: records.length,
            requestedLimit,
            pagesFetched: result.pagesFetched,
            truncated: result.truncated,
            nextLink: result.nextLink
          }
        },
        message: `Found **${records.length}** ${definition.name.toLowerCase()} record(s).`
      } as any;
    })
    .build();

export let createGetRecordTool = (definition: FinOpsResourceDefinition) =>
  SlateTool.create(spec, {
    name: definition.name,
    key: definition.key,
    description: definition.description,
    tags: {
      destructive: false,
      readOnly: true
    }
  })
    .input(z.object(keyInputFields))
    .output(
      z.object({
        entitySetName: z.string(),
        record: finOpsRecordSchema
      })
    )
    .handleInvocation(async rawCtx => {
      let ctx = rawCtx as FinOpsToolContext;
      let client = createClient(ctx, { includeDefaultLegalEntity: false });
      let entitySetName = resolveEntitySetName(ctx.input.entitySetName, definition);
      let metadata = await client.getMetadata();
      let record = await client.getDataEntityRecord<Record<string, unknown>>(
        metadata,
        entitySetName,
        ctx.input.keyValues ?? {},
        {
          select: ctx.input.select,
          expand: ctx.input.expand
        }
      );

      if (!isRecord(record)) {
        throw dynamicsFinOpsServiceError(
          `${definition.name} returned a non-object record.`,
          'dynamics_finops_response'
        );
      }

      return {
        output: {
          entitySetName,
          record: mapRecord(definition, record)
        },
        message: `Retrieved **${definition.name.toLowerCase()}** record.`
      };
    })
    .build();

export let createDraftRecordTool = (definition: FinOpsResourceDefinition) =>
  SlateTool.create(spec, {
    name: definition.name,
    key: definition.key,
    description: definition.description,
    constraints: [
      'This tool only creates draft data entity records. It does not post, settle, approve, or delete Finance records.'
    ],
    tags: {
      destructive: false,
      readOnly: false
    }
  })
    .input(z.object(createInputFields))
    .output(
      z.object({
        entitySetName: z.string(),
        record: finOpsRecordSchema
      })
    )
    .handleInvocation(async rawCtx => {
      let ctx = rawCtx as FinOpsToolContext;
      let client = createClient(ctx, { includeDefaultLegalEntity: false });
      let entitySetName = resolveEntitySetName(ctx.input.entitySetName, definition);
      let record = await client.createDataEntityRecord<Record<string, unknown>>(
        entitySetName,
        ctx.input.record ?? {}
      );

      if (!isRecord(record)) {
        throw dynamicsFinOpsServiceError(
          `${definition.name} returned a non-object record.`,
          'dynamics_finops_response'
        );
      }

      return {
        output: {
          entitySetName,
          record: mapRecord(definition, record)
        },
        message: `Created draft **${definition.name.toLowerCase()}** record.`
      };
    })
    .build();
