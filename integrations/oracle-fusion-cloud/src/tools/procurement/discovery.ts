import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { OracleFusionClient } from '../../lib/client';
import { adfContains, adfEquals, adfIdEquals, andFilters } from '../../lib/filters';
import { oracleFinder } from '../../lib/finders';
import { booleanField, idField, type OracleRecord, stringField } from '../../lib/records';
import {
  pageOutputFields,
  paginationInputFields,
  resourceIdSchema,
  resourceKeySchema
} from '../../lib/schemas';
import { spec } from '../../spec';

const BUSINESS_UNIT_FIELDS = ['ProcurementBUId', 'ProcurementBU', 'AgentAction'].join(',');
const BUSINESS_UNIT_FILTERS = ['ProcurementBUId', 'ProcurementBU', 'AgentAction'] as const;
const PERSON_FIELDS = [
  'PersonId',
  'PersonNumber',
  'DisplayName',
  'Email',
  'Department',
  'Job',
  'LocationId'
].join(',');
const PERSON_FILTERS = ['DisplayName', 'Email'] as const;
const BUYER_FIELDS = [
  'AgentId',
  'AgentAssignmentId',
  'DisplayName',
  'Email',
  'FirstName',
  'LastName',
  'ProcurementBuId',
  'ProcurementBU',
  'RequisitioningBU',
  'SysEffectiveDate'
].join(',');
const BUYER_FILTERS = ['AgentId', 'DisplayName', 'Email'] as const;
const LINE_TYPE_FIELDS = [
  'LineTypeId',
  'LineType',
  'LineTypeCode',
  'Description',
  'PurchaseBasis',
  'PurchaseBasisCode',
  'ProductType',
  'ProductTypeCode',
  'CreditFlag',
  'DefaultCategoryId',
  'DefaultCategory',
  'DefaultCategoryCode',
  'DefaultUOM',
  'DefaultUOMCode',
  'EndDate'
].join(',');
const LINE_TYPE_FILTERS = ['LineTypeId', 'LineType', 'PurchaseBasisCode'] as const;
const STYLE_FIELDS = [
  'StyleId',
  'StyleName',
  'DisplayName',
  'Description',
  'DocumentSubtype',
  'EnabledFlag',
  'Status',
  'StatusCode',
  'StyleType'
].join(',');
const STYLE_FILTERS = [
  'StyleId',
  'StyleName',
  'DocumentSubtype',
  'EnabledFlag',
  'StatusCode'
] as const;
const PREFERENCE_FIELDS = [
  'UserPreferenceId',
  'PersonId',
  'UserDisplayName',
  'UserEmail',
  'RequisitioningBUId',
  'RequisitioningBU',
  'RequesterId',
  'Requester',
  'RequesterEmail',
  'DeliverToLocationId',
  'DeliverToLocationCode',
  'DeliverToLocationName',
  'DestinationOrganizationId',
  'DestinationOrganizationCode',
  'DestinationOrganization',
  'DestinationTypeCode',
  'DestinationType',
  'DestinationSubinventory',
  'PreferenceType',
  'ActivePreferenceFlag'
].join(',');
const PREFERENCE_FILTERS = ['PersonId', 'PreferenceType', 'ActivePreferenceFlag'] as const;
const ACCOUNT_FIELDS = [
  'UserPreferenceAccountId',
  'UserPreferenceId',
  'CodeCombinationId',
  'ChargeAccount',
  'ChargeAccountNickname',
  'PrimaryFlag'
].join(',');
const ACCOUNT_FILTERS = ['ChargeAccountNickname', 'PrimaryFlag'] as const;

let identifierInput = z.string().regex(/^\d+$/).max(40);
let effectiveDateInput = z
  .string()
  .date()
  .optional()
  .describe('Date in YYYY-MM-DD format on which the Oracle record must be effective.');
let requiredId = (record: OracleRecord, field: string): string => {
  let value = idField(record, field);
  if (!value) {
    throw createApiServiceError(`Oracle Fusion did not return the required ${field}.`, {
      reason: 'oracle_fusion_invalid_response'
    });
  }
  return value;
};

let businessUnitSchema = z.object({
  resourceKey: resourceKeySchema,
  procurementBusinessUnitId: resourceIdSchema.describe(
    'ProcurementBUId to use when creating purchase orders or discovering assigned buyers.'
  ),
  procurementBusinessUnit: z.string().optional().describe('Procurement business unit name.'),
  agentAction: z.string().optional().describe('Authorized procurement action for this unit.')
});

let personSchema = z.object({
  resourceKey: resourceKeySchema,
  personId: resourceIdSchema.describe(
    'PersonId to use as a requisition requester or preparer, or to find requisition preferences.'
  ),
  personNumber: z.string().optional().describe('Business number identifying the person.'),
  displayName: z.string().optional().describe('Person display name.'),
  email: z.string().optional().describe('Person email address.'),
  department: z.string().optional().describe('Department of the person.'),
  job: z.string().optional().describe('Job of the person.'),
  locationId: resourceIdSchema.optional().describe('Location identifier of the person.')
});

let buyerSchema = z.object({
  resourceKey: resourceKeySchema,
  buyerId: resourceIdSchema.describe(
    'AgentId to use as the buyer when creating a purchase order.'
  ),
  agentAssignmentId: resourceIdSchema.describe('Identifier of the buyer assignment.'),
  displayName: z.string().optional().describe('Buyer display name.'),
  email: z.string().optional().describe('Buyer email address.'),
  firstName: z.string().optional().describe('Buyer first name.'),
  lastName: z.string().optional().describe('Buyer last name.'),
  procurementBusinessUnitId: resourceIdSchema.describe(
    'Procurement unit assigned to the buyer.'
  ),
  procurementBusinessUnit: z.string().optional().describe('Procurement business unit name.'),
  requisitioningBusinessUnit: z
    .string()
    .optional()
    .describe('Requisitioning business unit name.'),
  effectiveDate: z.string().optional().describe('Date from which the buyer is effective.')
});

let lineTypeSchema = z.object({
  resourceKey: resourceKeySchema,
  lineTypeId: resourceIdSchema.describe(
    'LineTypeId to use on a purchase order or requisition line.'
  ),
  lineType: z.string().optional().describe('Purchasing line type name.'),
  lineTypeCode: z.string().optional().describe('Purchasing line type abbreviation.'),
  description: z.string().optional().describe('Description of the purchasing line type.'),
  purchaseBasis: z.string().optional().describe('Purchase basis, such as goods or services.'),
  purchaseBasisCode: z.string().optional().describe('Oracle purchase basis code.'),
  productType: z.string().optional().describe('Product type for this line type.'),
  productTypeCode: z.string().optional().describe('Oracle product type code.'),
  creditLine: z
    .boolean()
    .optional()
    .describe(
      'Whether the document style enables this as a credit line type. Credit lines use negative prices.'
    ),
  defaultCategoryId: resourceIdSchema
    .optional()
    .describe('Default purchasing category identifier.'),
  defaultCategory: z.string().optional().describe('Default purchasing category name.'),
  defaultCategoryCode: z.string().optional().describe('Default purchasing category code.'),
  defaultUnitOfMeasure: z.string().optional().describe('Default unit of measure name.'),
  defaultUnitOfMeasureCode: z.string().optional().describe('Default unit of measure code.'),
  endDate: z.string().optional().describe('Date after which the line type is no longer valid.')
});

let documentStyleSchema = z.object({
  resourceKey: resourceKeySchema,
  documentStyleId: resourceIdSchema.describe('StyleId to use when creating a purchase order.'),
  styleName: z.string().optional().describe('Purchasing document style name.'),
  displayName: z.string().optional().describe('Purchasing document style display name.'),
  description: z.string().optional().describe('Description of the purchasing document style.'),
  documentSubtype: z.string().optional().describe('Oracle document subtype code.'),
  enabled: z
    .boolean()
    .optional()
    .describe('Whether the style is enabled for its document subtype.'),
  status: z.string().optional().describe('Style status name.'),
  statusCode: z.string().optional().describe('Style status code.'),
  styleType: z.string().optional().describe('Purchasing document style set.')
});

let preferenceSchema = z.object({
  resourceKey: resourceKeySchema.describe(
    'Requisition preference resourceKey to pass to list_requisition_charge_accounts.'
  ),
  userPreferenceId: resourceIdSchema.describe(
    'Business identifier of the requisition preferences.'
  ),
  personId: resourceIdSchema.describe('PersonId of the user whose preferences these are.'),
  userDisplayName: z.string().optional().describe('Display name of the user.'),
  userEmail: z.string().optional().describe('Email address of the user.'),
  requisitioningBusinessUnitId: resourceIdSchema.describe(
    'RequisitioningBUId to use when creating a purchase requisition.'
  ),
  requisitioningBusinessUnit: z
    .string()
    .optional()
    .describe('Requisitioning business unit name.'),
  requesterId: resourceIdSchema
    .optional()
    .describe('Default requester identifier for requisitions.'),
  requester: z.string().optional().describe('Default requester name.'),
  requesterEmail: z.string().optional().describe('Default requester email address.'),
  deliverToLocationId: resourceIdSchema
    .optional()
    .describe('Default final delivery location identifier.'),
  deliverToLocationCode: z
    .string()
    .optional()
    .describe('Default final delivery location code.'),
  deliverToLocationName: z
    .string()
    .optional()
    .describe('Default final delivery location name.'),
  destinationOrganizationId: resourceIdSchema
    .optional()
    .describe('Default receiving organization identifier.'),
  destinationOrganizationCode: z
    .string()
    .optional()
    .describe('Default receiving organization code.'),
  destinationOrganization: z
    .string()
    .optional()
    .describe('Default receiving organization name.'),
  destinationTypeCode: z
    .string()
    .optional()
    .describe('Default destination type code, such as EXPENSE.'),
  destinationType: z.string().optional().describe('Default destination type name.'),
  destinationSubinventory: z.string().optional().describe('Default destination subinventory.'),
  preferenceType: z
    .string()
    .optional()
    .describe('Preference flow, such as SSP or WORK_ORDER.'),
  active: z
    .boolean()
    .optional()
    .describe('Whether these are the active preferences for the user.')
});

let accountSchema = z.object({
  resourceKey: resourceKeySchema,
  userPreferenceAccountId: resourceIdSchema.describe(
    'Identifier of the favorite charge account.'
  ),
  userPreferenceId: resourceIdSchema.describe(
    'Identifier of the owning requisition preferences.'
  ),
  codeCombinationId: resourceIdSchema.describe(
    'Charge account combination identifier for requisition distributions.'
  ),
  chargeAccount: z
    .string()
    .optional()
    .describe('Account combination to charge for goods or services.'),
  nickname: z.string().optional().describe('Favorite charge account nickname.'),
  primary: z
    .boolean()
    .optional()
    .describe('Whether this is the primary favorite charge account.')
});

export let listProcurementBusinessUnits = SlateTool.create(spec, {
  name: 'List Procurement Business Units',
  key: 'list_procurement_business_units',
  description:
    'Discover procurement business units assigned to the connected agent, with names, identifiers, and authorized actions for purchasing workflows.',
  instructions: [
    'Use procurementBusinessUnitId when discovering buyers or creating purchase orders. Filters are combined with AND.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...paginationInputFields,
      procurementBusinessUnitId: identifierInput
        .optional()
        .describe('Exact procurement business unit identifier to match.'),
      nameContains: z
        .string()
        .min(1)
        .max(240)
        .optional()
        .describe('Literal text within the procurement business unit name.'),
      agentAction: z
        .enum([
          'MANAGE_PURCHASE_AGREEMENTS',
          'MANAGE_PURCHASE_ORDERS',
          'MANAGE_REQUISITIONS',
          'MANAGE_SUPPLIERS',
          'ANALYZE_SPEND',
          'MANAGE_ASLS',
          'MANAGE_CATALOG_CONTENT',
          'MANAGE_COMPLIANCE_CHECKLIST',
          'MANAGE_NEGOTIATIONS'
        ])
        .default('MANAGE_PURCHASE_ORDERS')
        .describe(
          'Authorized agent action to match. Defaults to business units available for managing purchase orders.'
        )
    })
  )
  .output(z.object({ items: z.array(businessUnitSchema), ...pageOutputFields }))
  .handleInvocation(async ctx => {
    let client = new OracleFusionClient(ctx.auth);
    let page = await client.list('fscm', '/procurementBusinessUnitsLOV', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      fields: BUSINESS_UNIT_FIELDS,
      orderBy: 'ProcurementBUId:asc',
      links: 'self',
      q: andFilters(
        adfIdEquals(
          'ProcurementBUId',
          ctx.input.procurementBusinessUnitId,
          BUSINESS_UNIT_FILTERS
        ),
        ctx.input.nameContains === undefined
          ? undefined
          : adfContains('ProcurementBU', ctx.input.nameContains, BUSINESS_UNIT_FILTERS),
        adfEquals('AgentAction', ctx.input.agentAction, BUSINESS_UNIT_FILTERS)
      )
    });
    return {
      output: {
        ...page,
        items: page.items.map(record => ({
          resourceKey: client.resourceKey(record, 'fscm', '/procurementBusinessUnitsLOV'),
          procurementBusinessUnitId: requiredId(record, 'ProcurementBUId'),
          procurementBusinessUnit: stringField(record, 'ProcurementBU'),
          agentAction: stringField(record, 'AgentAction')
        }))
      },
      message: `Found ${page.count} procurement business units in this page.`
    };
  })
  .build();

export let listProcurementRequesters = SlateTool.create(spec, {
  name: 'List Procurement Requesters',
  key: 'list_procurement_requesters',
  description:
    'Discover procurement persons by name or email, with person identifiers for requisition requester and preparer selection.',
  instructions: [
    'Use personId as requesterId or preparerId when preparing requisitions, and to discover requisition preferences. Name and email filters are combined with AND.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...paginationInputFields,
      searchTerm: z
        .string()
        .min(1)
        .max(240)
        .optional()
        .describe('Search term for Oracle requester display names or email addresses.'),
      displayName: z
        .string()
        .min(1)
        .max(240)
        .optional()
        .describe('Exact person display name to match.'),
      email: z
        .string()
        .min(1)
        .max(240)
        .optional()
        .describe('Exact person email address to match.')
    })
  )
  .output(z.object({ items: z.array(personSchema), ...pageOutputFields }))
  .handleInvocation(async ctx => {
    let client = new OracleFusionClient(ctx.auth);
    let page = await client.list('fscm', '/procurementPersonsLOV', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      fields: PERSON_FIELDS,
      orderBy: 'PersonId:asc',
      links: 'self',
      finder:
        ctx.input.searchTerm === undefined
          ? undefined
          : oracleFinder('findRequesterBySearchTerm', { searchTerm: ctx.input.searchTerm }),
      q: andFilters(
        ctx.input.displayName === undefined
          ? undefined
          : adfEquals('DisplayName', ctx.input.displayName, PERSON_FILTERS),
        ctx.input.email === undefined
          ? undefined
          : adfEquals('Email', ctx.input.email, PERSON_FILTERS)
      )
    });
    return {
      output: {
        ...page,
        items: page.items.map(record => ({
          resourceKey: client.resourceKey(record, 'fscm', '/procurementPersonsLOV'),
          personId: requiredId(record, 'PersonId'),
          personNumber: stringField(record, 'PersonNumber'),
          displayName: stringField(record, 'DisplayName'),
          email: stringField(record, 'Email'),
          department: stringField(record, 'Department'),
          job: stringField(record, 'Job'),
          locationId: idField(record, 'LocationId')
        }))
      },
      message: `Found ${page.count} procurement persons in this page.`
    };
  })
  .build();

export let listBuyers = SlateTool.create(spec, {
  name: 'List Buyers',
  key: 'list_buyers',
  description:
    'Discover buyers assigned to a procurement business unit, including buyer identifiers, names, emails, and assignment information.',
  instructions: [
    'First discover procurementBusinessUnitId with list_procurement_business_units. Use buyerId when creating a purchase order. Optional name and email filters are combined with AND.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...paginationInputFields,
      procurementBusinessUnitId: identifierInput.describe(
        'Procurement business unit identifier from list_procurement_business_units.'
      ),
      requisitioningBusinessUnitId: identifierInput
        .optional()
        .describe(
          'Optional requisitioning business unit identifier from list_requisition_preferences.'
        ),
      agentAccessActionCode: z
        .string()
        .min(1)
        .max(30)
        .optional()
        .describe(
          'Optional Oracle procurement agent access action code configured for the buyer assignment.'
        ),
      buyerId: identifierInput
        .optional()
        .describe('Exact AgentId to match within the selected business unit.'),
      displayNameContains: z
        .string()
        .min(1)
        .max(240)
        .optional()
        .describe('Literal text within the buyer display name.'),
      email: z
        .string()
        .min(1)
        .max(240)
        .optional()
        .describe('Exact buyer email address to match.'),
      effectiveDate: effectiveDateInput
    })
  )
  .output(z.object({ items: z.array(buyerSchema), ...pageOutputFields }))
  .handleInvocation(async ctx => {
    let client = new OracleFusionClient(ctx.auth);
    let page = await client.list('fscm', '/buyersLOV', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      fields: BUYER_FIELDS,
      orderBy: 'AgentAssignmentId:asc',
      links: 'self',
      effectiveDate: ctx.input.effectiveDate,
      finder: oracleFinder('findByProcurementBU', {
        ProcurementBuId: ctx.input.procurementBusinessUnitId,
        RequisitioningBuId: ctx.input.requisitioningBusinessUnitId,
        AgentAccessActionCode: ctx.input.agentAccessActionCode
      }),
      q: andFilters(
        adfIdEquals('AgentId', ctx.input.buyerId, BUYER_FILTERS),
        ctx.input.displayNameContains === undefined
          ? undefined
          : adfContains('DisplayName', ctx.input.displayNameContains, BUYER_FILTERS),
        ctx.input.email === undefined
          ? undefined
          : adfEquals('Email', ctx.input.email, BUYER_FILTERS)
      )
    });
    return {
      output: {
        ...page,
        items: page.items.map(record => ({
          resourceKey: client.resourceKey(record, 'fscm', '/buyersLOV'),
          buyerId: requiredId(record, 'AgentId'),
          agentAssignmentId: requiredId(record, 'AgentAssignmentId'),
          displayName: stringField(record, 'DisplayName'),
          email: stringField(record, 'Email'),
          firstName: stringField(record, 'FirstName'),
          lastName: stringField(record, 'LastName'),
          procurementBusinessUnitId: requiredId(record, 'ProcurementBuId'),
          procurementBusinessUnit: stringField(record, 'ProcurementBU'),
          requisitioningBusinessUnit: stringField(record, 'RequisitioningBU'),
          effectiveDate: stringField(record, 'SysEffectiveDate')
        }))
      },
      message: `Found ${page.count} buyers in this page.`
    };
  })
  .build();

export let listPurchasingLineTypes = SlateTool.create(spec, {
  name: 'List Purchasing Line Types',
  key: 'list_purchasing_line_types',
  description:
    'Discover purchasing line types, purchase basis, product type, default category, and unit of measure for purchase order and requisition lines.',
  instructions: [
    'Supply documentStyleId from list_purchasing_document_styles together with documentType to restrict line types to a document style. Filters are combined with AND.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...paginationInputFields,
      lineTypeId: identifierInput
        .optional()
        .describe('Exact purchasing line type identifier to match.'),
      lineTypeContains: z
        .string()
        .min(1)
        .max(30)
        .optional()
        .describe('Literal text within the purchasing line type name.'),
      purchaseBasisCode: z
        .string()
        .min(1)
        .max(30)
        .optional()
        .describe('Exact Oracle purchase basis code to match.'),
      documentStyleId: identifierInput
        .optional()
        .describe('StyleId from list_purchasing_document_styles. Requires documentType.'),
      documentType: z
        .string()
        .min(1)
        .max(30)
        .optional()
        .describe(
          'Oracle purchasing document type code for style filtering. Requires documentStyleId.'
        )
    })
  )
  .output(z.object({ items: z.array(lineTypeSchema), ...pageOutputFields }))
  .handleInvocation(async ctx => {
    if ((ctx.input.documentStyleId === undefined) !== (ctx.input.documentType === undefined)) {
      throw createApiServiceError(
        'Provide both documentStyleId and documentType to discover line types for a document style.',
        { reason: 'oracle_fusion_invalid_input' }
      );
    }
    let client = new OracleFusionClient(ctx.auth);
    let page = await client.list('fscm', '/purchasingLineTypesLOV', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      fields: LINE_TYPE_FIELDS,
      orderBy: 'LineTypeId:asc',
      links: 'self',
      finder:
        ctx.input.documentStyleId === undefined
          ? undefined
          : oracleFinder('findByDocumentStyle', {
              StyleId: ctx.input.documentStyleId,
              DocumentType: ctx.input.documentType
            }),
      q: andFilters(
        adfIdEquals('LineTypeId', ctx.input.lineTypeId, LINE_TYPE_FILTERS),
        ctx.input.lineTypeContains === undefined
          ? undefined
          : adfContains('LineType', ctx.input.lineTypeContains, LINE_TYPE_FILTERS),
        ctx.input.purchaseBasisCode === undefined
          ? undefined
          : adfEquals('PurchaseBasisCode', ctx.input.purchaseBasisCode, LINE_TYPE_FILTERS)
      )
    });
    return {
      output: {
        ...page,
        items: page.items.map(record => ({
          resourceKey: client.resourceKey(record, 'fscm', '/purchasingLineTypesLOV'),
          lineTypeId: requiredId(record, 'LineTypeId'),
          lineType: stringField(record, 'LineType'),
          lineTypeCode: stringField(record, 'LineTypeCode'),
          description: stringField(record, 'Description'),
          purchaseBasis: stringField(record, 'PurchaseBasis'),
          purchaseBasisCode: stringField(record, 'PurchaseBasisCode'),
          productType: stringField(record, 'ProductType'),
          productTypeCode: stringField(record, 'ProductTypeCode'),
          creditLine: booleanField(record, 'CreditFlag'),
          defaultCategoryId: idField(record, 'DefaultCategoryId'),
          defaultCategory: stringField(record, 'DefaultCategory'),
          defaultCategoryCode: stringField(record, 'DefaultCategoryCode'),
          defaultUnitOfMeasure: stringField(record, 'DefaultUOM'),
          defaultUnitOfMeasureCode: stringField(record, 'DefaultUOMCode'),
          endDate: stringField(record, 'EndDate')
        }))
      },
      message: `Found ${page.count} purchasing line types in this page.`
    };
  })
  .build();

export let listPurchasingDocumentStyles = SlateTool.create(spec, {
  name: 'List Purchasing Document Styles',
  key: 'list_purchasing_document_styles',
  description:
    'Discover purchasing document styles with identifiers, names, enabled state, and document subtype for purchase order creation.',
  instructions: [
    'Use documentStyleId when creating a purchase order or discovering line types for a document style. Filters are combined with AND.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...paginationInputFields,
      documentStyleId: identifierInput.optional().describe('Exact Oracle StyleId to match.'),
      styleNameContains: z
        .string()
        .min(1)
        .max(240)
        .optional()
        .describe('Literal text within the purchasing document style name.'),
      documentSubtype: z
        .string()
        .min(1)
        .max(25)
        .optional()
        .describe('Exact Oracle document subtype code to match.'),
      enabled: z
        .boolean()
        .default(true)
        .describe('Whether to return styles enabled for their document subtype.'),
      statusCode: z
        .string()
        .min(1)
        .max(30)
        .optional()
        .describe('Exact Oracle purchasing document style status code to match.')
    })
  )
  .output(z.object({ items: z.array(documentStyleSchema), ...pageOutputFields }))
  .handleInvocation(async ctx => {
    let client = new OracleFusionClient(ctx.auth);
    let page = await client.list('fscm', '/purchasingDocumentStylesLOV', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      fields: STYLE_FIELDS,
      links: 'self',
      q: andFilters(
        adfIdEquals('StyleId', ctx.input.documentStyleId, STYLE_FILTERS),
        ctx.input.styleNameContains === undefined
          ? undefined
          : adfContains('StyleName', ctx.input.styleNameContains, STYLE_FILTERS),
        ctx.input.documentSubtype === undefined
          ? undefined
          : adfEquals('DocumentSubtype', ctx.input.documentSubtype, STYLE_FILTERS),
        adfEquals('EnabledFlag', ctx.input.enabled, STYLE_FILTERS),
        ctx.input.statusCode === undefined
          ? undefined
          : adfEquals('StatusCode', ctx.input.statusCode, STYLE_FILTERS)
      )
    });
    return {
      output: {
        ...page,
        items: page.items.map(record => ({
          resourceKey: client.resourceKey(record, 'fscm', '/purchasingDocumentStylesLOV'),
          documentStyleId: requiredId(record, 'StyleId'),
          styleName: stringField(record, 'StyleName'),
          displayName: stringField(record, 'DisplayName'),
          description: stringField(record, 'Description'),
          documentSubtype: stringField(record, 'DocumentSubtype'),
          enabled: booleanField(record, 'EnabledFlag'),
          status: stringField(record, 'Status'),
          statusCode: stringField(record, 'StatusCode'),
          styleType: stringField(record, 'StyleType')
        }))
      },
      message: `Found ${page.count} purchasing document styles in this page.`
    };
  })
  .build();

export let listRequisitionPreferences = SlateTool.create(spec, {
  name: 'List Requisition Preferences',
  key: 'list_requisition_preferences',
  description:
    'Discover requisition preferences with requester, requisitioning business unit, delivery location, and receiving organization identifiers needed to prepare requisitions.',
  instructions: [
    'Use personId from list_procurement_requesters to find a person’s preferences. A requisitioningBusinessUnitId filter requires personId. Pass a returned resourceKey to list_requisition_charge_accounts.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...paginationInputFields,
      personId: identifierInput
        .optional()
        .describe(
          'PersonId from list_procurement_requesters whose requisition preferences to retrieve.'
        ),
      requisitioningBusinessUnitId: identifierInput
        .optional()
        .describe(
          'Requisitioning business unit identifier from a previously discovered preference. Requires personId and preferenceType SSP.'
        ),
      preferenceType: z
        .enum(['SSP', 'WORK_ORDER'])
        .default('SSP')
        .describe('Preference flow to retrieve: self-service procurement or work order.'),
      active: z
        .boolean()
        .default(true)
        .describe('Whether to return active requisition preferences.'),
      effectiveDate: effectiveDateInput
    })
  )
  .output(z.object({ items: z.array(preferenceSchema), ...pageOutputFields }))
  .handleInvocation(async ctx => {
    if (
      ctx.input.requisitioningBusinessUnitId !== undefined &&
      (ctx.input.personId === undefined || ctx.input.preferenceType !== 'SSP')
    ) {
      throw createApiServiceError(
        'A requisitioningBusinessUnitId filter requires personId and preferenceType SSP.',
        { reason: 'oracle_fusion_invalid_input' }
      );
    }
    let client = new OracleFusionClient(ctx.auth);
    let page = await client.list('fscm', '/requisitionPreferences', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      fields: PREFERENCE_FIELDS,
      orderBy: 'UserPreferenceId:asc',
      links: 'self',
      effectiveDate: ctx.input.effectiveDate,
      finder:
        ctx.input.requisitioningBusinessUnitId === undefined
          ? undefined
          : oracleFinder('FindSSPPreferenceByPersonAndBusinessUnit', {
              PersonId: ctx.input.personId,
              RequisitioningBUId: ctx.input.requisitioningBusinessUnitId,
              SysEffectiveDate: ctx.input.effectiveDate
            }),
      q: andFilters(
        adfIdEquals('PersonId', ctx.input.personId, PREFERENCE_FILTERS),
        adfEquals('PreferenceType', ctx.input.preferenceType, PREFERENCE_FILTERS),
        adfEquals('ActivePreferenceFlag', ctx.input.active, PREFERENCE_FILTERS)
      )
    });
    return {
      output: {
        ...page,
        items: page.items.map(record => ({
          resourceKey: client.resourceKey(record, 'fscm', '/requisitionPreferences'),
          userPreferenceId: requiredId(record, 'UserPreferenceId'),
          personId: requiredId(record, 'PersonId'),
          userDisplayName: stringField(record, 'UserDisplayName'),
          userEmail: stringField(record, 'UserEmail'),
          requisitioningBusinessUnitId: requiredId(record, 'RequisitioningBUId'),
          requisitioningBusinessUnit: stringField(record, 'RequisitioningBU'),
          requesterId: idField(record, 'RequesterId'),
          requester: stringField(record, 'Requester'),
          requesterEmail: stringField(record, 'RequesterEmail'),
          deliverToLocationId: idField(record, 'DeliverToLocationId'),
          deliverToLocationCode: stringField(record, 'DeliverToLocationCode'),
          deliverToLocationName: stringField(record, 'DeliverToLocationName'),
          destinationOrganizationId: idField(record, 'DestinationOrganizationId'),
          destinationOrganizationCode: stringField(record, 'DestinationOrganizationCode'),
          destinationOrganization: stringField(record, 'DestinationOrganization'),
          destinationTypeCode: stringField(record, 'DestinationTypeCode'),
          destinationType: stringField(record, 'DestinationType'),
          destinationSubinventory: stringField(record, 'DestinationSubinventory'),
          preferenceType: stringField(record, 'PreferenceType'),
          active: booleanField(record, 'ActivePreferenceFlag')
        }))
      },
      message: `Found ${page.count} requisition preferences in this page.`
    };
  })
  .build();

export let listRequisitionChargeAccounts = SlateTool.create(spec, {
  name: 'List Requisition Charge Accounts',
  key: 'list_requisition_charge_accounts',
  description:
    'Discover favorite charge accounts saved in requisition preferences, including account combinations, identifiers, nicknames, and primary status.',
  instructions: [
    'Discover requisitionPreferenceKey with list_requisition_preferences. Use codeCombinationId or chargeAccount when preparing a requisition distribution. Filters are combined with AND.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      requisitionPreferenceKey: resourceKeySchema.describe(
        'Requisition preference resourceKey from list_requisition_preferences. Do not construct it from userPreferenceId.'
      ),
      ...paginationInputFields,
      nickname: z
        .string()
        .min(1)
        .max(50)
        .optional()
        .describe('Exact favorite charge account nickname to match.'),
      primary: z
        .boolean()
        .optional()
        .describe(
          'Whether to return only primary or only nonprimary favorite charge accounts.'
        )
    })
  )
  .output(z.object({ items: z.array(accountSchema), ...pageOutputFields }))
  .handleInvocation(async ctx => {
    let client = new OracleFusionClient(ctx.auth);
    let collection = client.childCollectionPath(
      '/requisitionPreferences',
      ctx.input.requisitionPreferenceKey,
      'favoriteChargeAccounts'
    );
    let page = await client.list('fscm', collection, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      fields: ACCOUNT_FIELDS,
      orderBy: 'UserPreferenceAccountId:asc',
      links: 'self',
      q: andFilters(
        ctx.input.nickname === undefined
          ? undefined
          : adfEquals('ChargeAccountNickname', ctx.input.nickname, ACCOUNT_FILTERS),
        ctx.input.primary === undefined
          ? undefined
          : adfEquals('PrimaryFlag', ctx.input.primary, ACCOUNT_FILTERS)
      )
    });
    return {
      output: {
        ...page,
        items: page.items.map(record => ({
          resourceKey: client.resourceKey(record, 'fscm', collection),
          userPreferenceAccountId: requiredId(record, 'UserPreferenceAccountId'),
          userPreferenceId: requiredId(record, 'UserPreferenceId'),
          codeCombinationId: requiredId(record, 'CodeCombinationId'),
          chargeAccount: stringField(record, 'ChargeAccount'),
          nickname: stringField(record, 'ChargeAccountNickname'),
          primary: booleanField(record, 'PrimaryFlag')
        }))
      },
      message: `Found ${page.count} requisition charge accounts in this page.`
    };
  })
  .build();

export let procurementDiscoveryTools = {
  list_procurement_business_units: listProcurementBusinessUnits,
  list_procurement_requesters: listProcurementRequesters,
  list_buyers: listBuyers,
  list_purchasing_line_types: listPurchasingLineTypes,
  list_purchasing_document_styles: listPurchasingDocumentStyles,
  list_requisition_preferences: listRequisitionPreferences,
  list_requisition_charge_accounts: listRequisitionChargeAccounts
};
