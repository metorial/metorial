import {
  dataverseValidationError,
  formatDataverseODataString,
  normalizeDataverseGuid
} from '@slates/microsoft-dataverse-recipes';
import { createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { createDynamicsClient } from '../../lib/client';
import { spec } from '../../spec';

let recordSchema = z.record(z.string(), z.any());
let DEFAULT_LIST_TOP = 50;
let DEFAULT_METADATA_SEARCH = 'msdynci';
let DEFAULT_METADATA_LIMIT = 25;
let MAX_METADATA_LIMIT = 100;
let SEGMENT_MEMBERSHIP_ENTITY_SET_NAME = 'msdynci_segmentmemberships';
let SEGMENT_MEMBERSHIP_SEGMENTS_COLUMN = 'msdynci_segments';

let customerInsightsResourceTypes = [
  'customer_profile',
  'alternate_key',
  'segment',
  'measure',
  'customer_measure',
  'activity',
  'unified_activity',
  'enrichment',
  'prediction',
  'segment_membership'
] as const;

let customerInsightsResourceTypeSchema = z.enum(customerInsightsResourceTypes);
type CustomerInsightsResourceType = z.infer<typeof customerInsightsResourceTypeSchema>;

let customerInsightsResources: Record<
  CustomerInsightsResourceType,
  { entitySetName: string; displayName: string; defaultSelect?: string[] }
> = {
  customer_profile: {
    entitySetName: 'msdynci_customerprofiles',
    displayName: 'customer profiles'
  },
  alternate_key: {
    entitySetName: 'msdynci_alternatekeys',
    displayName: 'alternate keys'
  },
  segment: {
    entitySetName: 'msdynci_segments',
    displayName: 'segments',
    defaultSelect: [
      'msdynci_segmentid',
      'msdynci_name',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  },
  measure: {
    entitySetName: 'msdynci_measures',
    displayName: 'measures'
  },
  customer_measure: {
    entitySetName: 'msdynci_customermeasures',
    displayName: 'customer measures'
  },
  activity: {
    entitySetName: 'msdynci_unifiedactivities',
    displayName: 'activities'
  },
  unified_activity: {
    entitySetName: 'msdynci_unifiedactivities',
    displayName: 'unified activities'
  },
  enrichment: {
    entitySetName: 'msdynci_enrichments',
    displayName: 'enrichments'
  },
  prediction: {
    entitySetName: 'msdynci_predictions',
    displayName: 'predictions'
  },
  segment_membership: {
    entitySetName: SEGMENT_MEMBERSHIP_ENTITY_SET_NAME,
    displayName: 'segment memberships'
  }
};

let resolveResource = (resourceType: CustomerInsightsResourceType, override?: string) => ({
  ...customerInsightsResources[resourceType],
  entitySetName: override?.trim() || customerInsightsResources[resourceType].entitySetName
});

let combineFilters = (...filters: Array<string | undefined>) =>
  filters
    .map(filter => filter?.trim())
    .filter((filter): filter is string => Boolean(filter))
    .map(filter => `(${filter})`)
    .join(' and ');

let containsFilter = (column: string, value: string) =>
  `contains(${column},'${formatDataverseODataString(value)}')`;

let buildSegmentNameFilter = (column: string, value: string) =>
  containsFilter(column, column === SEGMENT_MEMBERSHIP_SEGMENTS_COLUMN ? `"${value}"` : value);

let csvEscape = (value: unknown) => {
  if (value === null || value === undefined) return '';
  let text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

let inferColumns = (records: Record<string, unknown>[], preferred?: string[]) => {
  if (preferred && preferred.length > 0) return preferred;
  let columns = new Set<string>();
  for (let record of records) {
    for (let key of Object.keys(record)) {
      columns.add(key);
    }
  }

  return [...columns];
};

let toCsv = (records: Record<string, unknown>[], columns: string[]) =>
  [
    columns.map(csvEscape).join(','),
    ...records.map(record => columns.map(column => csvEscape(record[column])).join(','))
  ].join('\n');

let metadataAttributeSchema = z.object({
  logicalName: z.string().optional(),
  schemaName: z.string().optional(),
  type: z.string().optional(),
  displayName: z.string().optional(),
  description: z.string().optional(),
  requiredLevel: z.string().optional(),
  isValidForCreate: z.boolean().optional(),
  isValidForUpdate: z.boolean().optional(),
  isValidForRead: z.boolean().optional(),
  targets: z.array(z.string()).optional(),
  attributeOf: z.string().optional(),
  metadataId: z.string().optional()
});

let metadataTableSchema = z.object({
  logicalName: z.string().optional(),
  entitySetName: z.string().optional(),
  schemaName: z.string().optional(),
  displayName: z.string().optional(),
  description: z.string().optional(),
  primaryIdAttribute: z.string().optional(),
  primaryNameAttribute: z.string().optional(),
  ownershipType: z.string().optional(),
  isActivity: z.boolean().optional(),
  metadataId: z.string().optional(),
  attributes: z.array(metadataAttributeSchema).optional()
});

let entityMetadataSelect = [
  'LogicalName',
  'EntitySetName',
  'SchemaName',
  'DisplayName',
  'Description',
  'PrimaryIdAttribute',
  'PrimaryNameAttribute',
  'OwnershipType',
  'IsActivity',
  'MetadataId'
];

let normalizeMetadataLimit = (maxTables: number | undefined) => {
  let limit = maxTables ?? DEFAULT_METADATA_LIMIT;
  if (!Number.isInteger(limit) || limit < 1) {
    throw dataverseValidationError('maxTables must be a positive integer.');
  }
  if (limit > MAX_METADATA_LIMIT) {
    throw dataverseValidationError(`maxTables cannot exceed ${MAX_METADATA_LIMIT}.`);
  }

  return limit;
};

let buildMetadataFilter = (input: { search?: string; filter?: string }) => {
  if (input.filter?.trim()) return input.filter.trim();

  let search = input.search?.trim() || DEFAULT_METADATA_SEARCH;
  let escaped = formatDataverseODataString(search);
  return [
    `contains(LogicalName,'${escaped}')`,
    `contains(EntitySetName,'${escaped}')`,
    `contains(SchemaName,'${escaped}')`
  ].join(' or ');
};

let listInputSchema = z.object({
  resourceType: customerInsightsResourceTypeSchema.describe(
    'Customer Insights record type to query'
  ),
  entitySetNameOverride: z
    .string()
    .optional()
    .describe(
      'Override the default Dataverse entity set name for tenant-specific table naming.'
    ),
  select: z
    .array(z.string())
    .optional()
    .describe('Columns to return. Defaults to core columns for the selected type.'),
  filter: z.string().optional().describe('OData $filter expression'),
  orderBy: z.string().optional().describe('OData $orderby expression'),
  expand: z.string().optional().describe('OData $expand expression'),
  top: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('OData $top value. Defaults to 50 when omitted.'),
  pageSize: z.number().int().positive().optional().describe('Preferred Dataverse page size'),
  nextLink: z
    .string()
    .optional()
    .describe(
      'Dataverse @odata.nextLink from a previous response. Use it unchanged without select, filter, orderBy, expand, top, or includeCount.'
    ),
  includeCount: z.boolean().optional().describe('Whether to request @odata.count')
});

let validateListInput = (input: z.infer<typeof listInputSchema>) => {
  if (input.top !== undefined && input.pageSize !== undefined) {
    throw dataverseValidationError(
      'Use either top for a single limited Dataverse page or pageSize for Dataverse paging, not both. Dataverse ignores $top when odata.maxpagesize is used.'
    );
  }

  if (input.nextLink === undefined) return undefined;

  let nextLink = input.nextLink.trim();
  if (!nextLink) {
    throw dataverseValidationError('nextLink is required when provided.');
  }

  let incompatibleOptions = [
    input.select !== undefined ? 'select' : undefined,
    input.filter !== undefined ? 'filter' : undefined,
    input.orderBy !== undefined ? 'orderBy' : undefined,
    input.expand !== undefined ? 'expand' : undefined,
    input.top !== undefined ? 'top' : undefined,
    input.includeCount === true ? 'includeCount' : undefined
  ].filter((option): option is string => Boolean(option));

  if (incompatibleOptions.length > 0) {
    throw dataverseValidationError(
      `Do not combine nextLink with ${incompatibleOptions.join(', ')}. Dataverse nextLink values already contain the query state for the next page.`
    );
  }

  return nextLink;
};

export let listCustomerInsightsTables = SlateTool.create(spec, {
  key: 'list_customer_insights_tables',
  name: 'List Customer Insights Tables',
  description:
    'Discover Dynamics 365 Customer Insights Dataverse table metadata, entity set names, primary columns, and optionally readable attributes.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe(
          'Substring to match against Dataverse logical, entity set, or schema names. Defaults to msdynci.'
        ),
      filter: z
        .string()
        .optional()
        .describe(
          'Advanced EntityDefinitions OData $filter expression. Overrides search when provided.'
        ),
      includeAttributes: z
        .boolean()
        .optional()
        .describe('Whether to include table attribute metadata. Defaults to false.'),
      readableAttributesOnly: z
        .boolean()
        .optional()
        .describe(
          'When includeAttributes is true, omit attributes not valid for read. Defaults to true.'
        ),
      maxTables: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum metadata tables to return. Defaults to 25 and cannot exceed 100.')
    })
  )
  .output(
    z.object({
      search: z.string().optional(),
      filter: z.string(),
      tables: z.array(metadataTableSchema),
      tableCount: z.number(),
      complete: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let maxTables = normalizeMetadataLimit(ctx.input.maxTables);
    let filter = buildMetadataFilter(ctx.input);
    let client = createDynamicsClient(ctx);
    let tables = await client.getEntityDefinitions({
      select: entityMetadataSelect,
      filter
    });
    let limitedTables = tables.slice(0, maxTables);
    let readableAttributesOnly = ctx.input.readableAttributesOnly ?? true;

    if (ctx.input.includeAttributes) {
      for (let table of limitedTables) {
        if (!table.logicalName) continue;

        let attributes = await client.getEntityAttributes(table.logicalName);
        table.attributes = readableAttributesOnly
          ? attributes.filter(attribute => attribute.isValidForRead !== false)
          : attributes;
      }
    }

    return {
      output: {
        search: ctx.input.search,
        filter,
        tables: limitedTables,
        tableCount: limitedTables.length,
        complete: tables.length <= maxTables
      },
      message: `Retrieved **${limitedTables.length}** Dynamics 365 Customer Insights Dataverse table definitions.`
    };
  })
  .build();

export let listCustomerInsightsRecords = SlateTool.create(spec, {
  key: 'list_customer_insights_records',
  name: 'List Customer Insights Records',
  description:
    'List Dynamics 365 Customer Insights customer profiles, alternate keys, segments, measures, activities, enrichments, predictions, and segment memberships with Dataverse OData query options.',
  tags: { readOnly: true, destructive: false }
})
  .input(listInputSchema)
  .output(
    z.object({
      resourceType: customerInsightsResourceTypeSchema,
      entitySetName: z.string(),
      records: z.array(recordSchema),
      nextLink: z.string().nullable(),
      count: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let nextLink = validateListInput(ctx.input);
    let resource = resolveResource(ctx.input.resourceType, ctx.input.entitySetNameOverride);
    let page = await createDynamicsClient(ctx).listRecords(resource.entitySetName, {
      select: ctx.input.select ?? resource.defaultSelect,
      filter: ctx.input.filter,
      orderBy: ctx.input.orderBy,
      expand: ctx.input.expand,
      top:
        nextLink || ctx.input.pageSize ? ctx.input.top : (ctx.input.top ?? DEFAULT_LIST_TOP),
      pageSize: ctx.input.pageSize,
      nextLink,
      includeCount: ctx.input.includeCount
    });

    return {
      output: {
        resourceType: ctx.input.resourceType,
        entitySetName: resource.entitySetName,
        records: page.records,
        nextLink: page.nextLink,
        count: page.count
      },
      message: `Retrieved **${page.records.length}** Dynamics 365 Customer Insights ${resource.displayName}.`
    };
  })
  .build();

export let getCustomerInsightsRecord = SlateTool.create(spec, {
  key: 'get_customer_insights_record',
  name: 'Get Customer Insights Record',
  description:
    'Retrieve one Dynamics 365 Customer Insights customer profile, alternate key, segment, measure, activity, enrichment, prediction, or segment membership by Dataverse GUID.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      resourceType: customerInsightsResourceTypeSchema.describe(
        'Customer Insights record type'
      ),
      entitySetNameOverride: z
        .string()
        .optional()
        .describe('Override the default Dataverse entity set name.'),
      recordId: z.string().describe('Dataverse record GUID'),
      select: z.array(z.string()).optional().describe('Columns to return'),
      expand: z.string().optional().describe('OData $expand expression')
    })
  )
  .output(
    z.object({
      resourceType: customerInsightsResourceTypeSchema,
      entitySetName: z.string(),
      record: recordSchema
    })
  )
  .handleInvocation(async ctx => {
    let resource = resolveResource(ctx.input.resourceType, ctx.input.entitySetNameOverride);
    let record = await createDynamicsClient(ctx).getRecord(
      resource.entitySetName,
      ctx.input.recordId,
      {
        select: ctx.input.select ?? resource.defaultSelect,
        expand: ctx.input.expand
      }
    );

    return {
      output: {
        resourceType: ctx.input.resourceType,
        entitySetName: resource.entitySetName,
        record
      },
      message: `Retrieved Dynamics 365 Customer Insights ${resource.displayName} record **${ctx.input.recordId}**.`
    };
  })
  .build();

export let exportSegmentMembers = SlateTool.create(spec, {
  key: 'export_segment_members',
  name: 'Export Segment Members',
  description:
    'Export Dynamics 365 Customer Insights segment-member rows from Dataverse as CSV or JSON through a Slate text attachment.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      entitySetNameOverride: z
        .string()
        .optional()
        .describe(
          `Segment membership entity set name. Defaults to ${SEGMENT_MEMBERSHIP_ENTITY_SET_NAME}.`
        ),
      segmentId: z
        .string()
        .optional()
        .describe(
          'Optional segment GUID for tenant-specific segment lookup columns. Requires segmentFilterColumn; the documented Customer Insights table uses segmentName with msdynci_segments.'
        ),
      segmentFilterColumn: z
        .string()
        .optional()
        .describe(
          'Tenant-specific lookup/value column used with segmentId, such as _msdynci_segmentid_value.'
        ),
      segmentName: z
        .string()
        .optional()
        .describe(
          'Optional segment name used to filter the documented segment membership table.'
        ),
      segmentNameColumn: z
        .string()
        .optional()
        .describe(
          `Text column used with segmentName. Defaults to ${SEGMENT_MEMBERSHIP_SEGMENTS_COLUMN}.`
        ),
      filter: z
        .string()
        .optional()
        .describe('Additional or replacement OData $filter expression.'),
      select: z
        .array(z.string())
        .optional()
        .describe('Columns to export. When omitted, columns are inferred from returned rows.'),
      orderBy: z.string().optional().describe('OData $orderby expression'),
      maxPages: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum Dataverse pages to follow. Defaults to the recipe limit.'),
      maxRecords: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum records to export. Defaults to 5000.'),
      pageSize: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Preferred Dataverse page size'),
      exportFormat: z
        .enum(['csv', 'json'])
        .optional()
        .describe('Attachment format. Defaults to csv.'),
      fileName: z.string().optional().describe('Attachment filename')
    })
  )
  .output(
    z.object({
      entitySetName: z.string(),
      segmentId: z.string().optional(),
      recordCount: z.number(),
      complete: z.boolean(),
      nextLink: z.string().nullable(),
      fileName: z.string(),
      mimeType: z.string(),
      attachmentCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let entitySetName =
      ctx.input.entitySetNameOverride?.trim() || SEGMENT_MEMBERSHIP_ENTITY_SET_NAME;
    if (ctx.input.segmentId && !ctx.input.segmentFilterColumn?.trim()) {
      throw dataverseValidationError(
        `segmentFilterColumn is required when segmentId is provided. The documented Customer Insights segment membership table filters segment names with ${SEGMENT_MEMBERSHIP_SEGMENTS_COLUMN}.`
      );
    }

    let segmentFilter = ctx.input.segmentId
      ? `${ctx.input.segmentFilterColumn?.trim()} eq ${normalizeDataverseGuid(ctx.input.segmentId)}`
      : undefined;
    let segmentNameColumn =
      ctx.input.segmentNameColumn?.trim() || SEGMENT_MEMBERSHIP_SEGMENTS_COLUMN;
    let segmentNameFilter = ctx.input.segmentName
      ? buildSegmentNameFilter(segmentNameColumn, ctx.input.segmentName)
      : undefined;
    let filter =
      combineFilters(segmentFilter, segmentNameFilter, ctx.input.filter) || undefined;
    let result = await createDynamicsClient(ctx).listAllRecords(entitySetName, {
      select: ctx.input.select,
      filter,
      orderBy: ctx.input.orderBy,
      pageSize: ctx.input.pageSize,
      maxPages: ctx.input.maxPages,
      maxRecords: ctx.input.maxRecords ?? 5000
    });
    let records = result.records as Record<string, unknown>[];
    let format = ctx.input.exportFormat ?? 'csv';
    let columns = inferColumns(records, ctx.input.select);
    let content =
      format === 'json' ? JSON.stringify(records, null, 2) : toCsv(records, columns);
    let mimeType = format === 'json' ? 'application/json' : 'text/csv';
    let fileName =
      ctx.input.fileName ??
      `customer-insights-segment-members-${ctx.input.segmentId ?? 'export'}.${format}`;

    return {
      output: {
        entitySetName,
        segmentId: ctx.input.segmentId,
        recordCount: records.length,
        complete: result.complete,
        nextLink: result.nextLink,
        fileName,
        mimeType,
        attachmentCount: 1
      },
      message: `Exported **${records.length}** Customer Insights segment member rows.`,
      attachments: [createTextAttachment(content, mimeType)]
    };
  })
  .build();
