import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  andFilters,
  odataDateTimeLiteral,
  odataStringLiteral,
  orFilters,
  substringFilter
} from '../lib/client';
import { spec } from '../spec';
import {
  compactOutput,
  createClient,
  ensureFilteredQuery,
  firstNavigationRecord,
  navigationArray,
  pageInputSchema,
  pageOutputSchema,
  pageSummary,
  rawRecordSchema,
  stringValue,
  topValue,
  uniqueStrings
} from './shared';

const serviceName = 'API_BUSINESS_PARTNER';

let addressSchema = z.object({
  addressId: z.string().optional().describe('SAP address id.'),
  country: z.string().optional().describe('Country/region code.'),
  cityName: z.string().optional().describe('City.'),
  postalCode: z.string().optional().describe('Postal code.'),
  streetName: z.string().optional().describe('Street name.'),
  houseNumber: z.string().optional().describe('House number.'),
  emailAddress: z.string().optional().describe('Email address when expanded and authorized.'),
  phoneNumber: z.string().optional().describe('Phone number when expanded and authorized.'),
  record: rawRecordSchema
});

let roleSchema = z.object({
  role: z.string().optional().describe('SAP business partner role code.'),
  validFrom: z.string().optional().describe('Role validity start.'),
  validTo: z.string().optional().describe('Role validity end.'),
  record: rawRecordSchema
});

let businessPartnerSchema = z.object({
  businessPartner: z.string().optional().describe('SAP business partner id.'),
  businessPartnerCategory: z.string().optional().describe('Business partner category.'),
  fullName: z.string().optional().describe('Person or organization display name.'),
  organizationName: z.string().optional().describe('Organization name.'),
  firstName: z.string().optional().describe('Person first name.'),
  lastName: z.string().optional().describe('Person last name.'),
  customer: z.string().optional().describe('SAP customer id when the partner is a customer.'),
  supplier: z.string().optional().describe('SAP supplier id when the partner is a supplier.'),
  isCustomer: z.boolean().optional().describe('Whether a customer role/entity was expanded.'),
  isSupplier: z.boolean().optional().describe('Whether a supplier role/entity was expanded.'),
  roles: z.array(roleSchema).optional().describe('Expanded business partner roles.'),
  addresses: z
    .array(addressSchema)
    .optional()
    .describe('Expanded business partner addresses.'),
  taxNumbers: z.array(rawRecordSchema).optional().describe('Expanded tax number records.'),
  bankAccounts: z.array(rawRecordSchema).optional().describe('Expanded bank account records.'),
  lastChangeDate: z.string().optional().describe('Last changed date.'),
  lastChangeTime: z.string().optional().describe('Last changed time.'),
  lastChangeDateTime: z
    .string()
    .optional()
    .describe('Last changed timestamp when returned by the SAP tenant.'),
  record: rawRecordSchema
});

let firstNavigationString = (
  record: Record<string, unknown>,
  navigation: string,
  field: string
) => {
  let value = firstNavigationRecord(record, navigation);
  return value ? stringValue(value, field) : undefined;
};

export let mapAddress = (address: Record<string, unknown>) => ({
  ...compactOutput({
    addressId: stringValue(address, 'AddressID'),
    country: stringValue(address, 'Country'),
    cityName: stringValue(address, 'CityName'),
    postalCode: stringValue(address, 'PostalCode'),
    streetName: stringValue(address, 'StreetName'),
    houseNumber: stringValue(address, 'HouseNumber'),
    emailAddress:
      stringValue(address, 'EmailAddress') ??
      firstNavigationString(address, 'to_EmailAddress', 'EmailAddress'),
    phoneNumber:
      stringValue(address, 'PhoneNumber') ??
      firstNavigationString(address, 'to_PhoneNumber', 'PhoneNumber') ??
      firstNavigationString(address, 'to_MobilePhoneNumber', 'PhoneNumber')
  }),
  record: address
});

let mapRole = (role: Record<string, unknown>) => ({
  ...compactOutput({
    role: stringValue(role, 'BusinessPartnerRole'),
    validFrom: stringValue(role, 'ValidFrom'),
    validTo: stringValue(role, 'ValidTo')
  }),
  record: role
});

let mapBusinessPartner = (partner: Record<string, unknown>) => {
  let roles = navigationArray(partner, 'to_BusinessPartnerRole').map(mapRole);
  let addresses = navigationArray(partner, 'to_BusinessPartnerAddress').map(mapAddress);
  let customer = firstNavigationRecord(partner, 'to_Customer');
  let supplier = firstNavigationRecord(partner, 'to_Supplier');
  let partnerCustomer = stringValue(partner, 'Customer') || undefined;
  let partnerSupplier = stringValue(partner, 'Supplier') || undefined;
  let taxNumbers = navigationArray(partner, 'to_BusinessPartnerTax');
  let bankAccounts = navigationArray(partner, 'to_BusinessPartnerBank');

  return {
    ...compactOutput({
      businessPartner: stringValue(partner, 'BusinessPartner'),
      businessPartnerCategory: stringValue(partner, 'BusinessPartnerCategory'),
      fullName:
        stringValue(partner, 'BusinessPartnerFullName') ??
        stringValue(partner, 'FullName') ??
        stringValue(partner, 'BusinessPartnerName'),
      organizationName:
        stringValue(partner, 'OrganizationBPName1') ??
        stringValue(partner, 'OrganizationBPName2'),
      firstName: stringValue(partner, 'FirstName'),
      lastName: stringValue(partner, 'LastName'),
      customer: partnerCustomer ?? (customer ? stringValue(customer, 'Customer') : undefined),
      supplier: partnerSupplier ?? (supplier ? stringValue(supplier, 'Supplier') : undefined),
      isCustomer: partnerCustomer || customer ? true : undefined,
      isSupplier: partnerSupplier || supplier ? true : undefined,
      roles: roles.length > 0 ? roles : undefined,
      addresses: addresses.length > 0 ? addresses : undefined,
      taxNumbers: taxNumbers.length > 0 ? taxNumbers : undefined,
      bankAccounts: bankAccounts.length > 0 ? bankAccounts : undefined,
      lastChangeDate: stringValue(partner, 'LastChangeDate'),
      lastChangeTime: stringValue(partner, 'LastChangeTime'),
      lastChangeDateTime: stringValue(partner, 'LastChangeDateTime')
    }),
    record: partner
  };
};

let addressExpansions = (includeCommunication = false) => [
  'to_BusinessPartnerAddress',
  ...(includeCommunication
    ? [
        'to_BusinessPartnerAddress/to_EmailAddress',
        'to_BusinessPartnerAddress/to_PhoneNumber',
        'to_BusinessPartnerAddress/to_MobilePhoneNumber'
      ]
    : [])
];

export let expandFor = (
  expand?: 'summary' | 'roles' | 'addresses' | 'customerSupplier' | 'financial' | 'all',
  options: { includeAddressCommunication?: boolean } = {}
) => {
  if (expand === 'summary' || !expand) return ['to_Customer', 'to_Supplier'];
  if (expand === 'roles') return ['to_BusinessPartnerRole', 'to_Customer', 'to_Supplier'];
  if (expand === 'addresses')
    return [
      ...addressExpansions(options.includeAddressCommunication),
      'to_Customer',
      'to_Supplier'
    ];
  if (expand === 'customerSupplier') return ['to_Customer', 'to_Supplier'];
  if (expand === 'financial') {
    return ['to_BusinessPartnerTax', 'to_BusinessPartnerBank', 'to_Customer', 'to_Supplier'];
  }
  return [
    ...addressExpansions(options.includeAddressCommunication),
    'to_BusinessPartnerRole',
    'to_BusinessPartnerTax',
    'to_BusinessPartnerBank',
    'to_Customer',
    'to_Supplier'
  ];
};

export let buildBusinessPartnerFilters = (input: {
  search?: string;
  businessPartner?: string;
  customer?: boolean;
  supplier?: boolean;
  createdSince?: string;
  updatedSince?: string;
}) =>
  andFilters([
    input.businessPartner
      ? `BusinessPartner eq ${odataStringLiteral(input.businessPartner)}`
      : undefined,
    input.search
      ? orFilters([
          substringFilter('BusinessPartner', input.search),
          substringFilter('BusinessPartnerFullName', input.search),
          substringFilter('OrganizationBPName1', input.search),
          substringFilter('FirstName', input.search),
          substringFilter('LastName', input.search)
        ])
      : undefined,
    input.createdSince
      ? `CreationDate ge ${odataDateTimeLiteral(input.createdSince, 'datetime')}`
      : undefined,
    input.updatedSince
      ? `LastChangeDate ge ${odataDateTimeLiteral(input.updatedSince, 'datetime')}`
      : undefined,
    input.customer ? "Customer ne ''" : undefined,
    input.supplier ? "Supplier ne ''" : undefined
  ]);

export let listBusinessPartners = SlateTool.create(spec, {
  name: 'List Business Partners',
  key: 'list_business_partners',
  description:
    'List SAP S/4HANA business partners with optional identity, search, role, customer, supplier, created, and changed filters.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe(
          'Search business partner id, full name, organization name, first name, or last name.'
        ),
      businessPartner: z.string().optional().describe('Exact SAP business partner id.'),
      role: z
        .string()
        .optional()
        .describe('Business partner role code such as FLCU01 or FLVN01.'),
      customer: z
        .boolean()
        .optional()
        .describe('Set true to restrict to partners with a documented customer id.'),
      supplier: z
        .boolean()
        .optional()
        .describe('Set true to restrict to partners with a documented supplier id.'),
      createdSince: z
        .string()
        .optional()
        .describe('Return partners created on or after this date/datetime.'),
      updatedSince: z
        .string()
        .optional()
        .describe('Return partners changed on or after this date/datetime.'),
      expand: z
        .enum(['summary', 'roles', 'addresses', 'customerSupplier', 'financial', 'all'])
        .optional()
        .describe(
          'Related business partner data to expand. Defaults to customer/supplier summary.'
        ),
      ...pageInputSchema
    })
  )
  .output(
    z.object({
      businessPartners: z.array(businessPartnerSchema).describe('Business partners.'),
      page: pageOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    ensureFilteredQuery(
      ctx.input,
      {
        search: ctx.input.search,
        businessPartner: ctx.input.businessPartner,
        role: ctx.input.role,
        customer: ctx.input.customer,
        supplier: ctx.input.supplier,
        createdSince: ctx.input.createdSince,
        updatedSince: ctx.input.updatedSince
      },
      'business partner'
    );

    let client = createClient(ctx);
    let filters = buildBusinessPartnerFilters(ctx.input);
    let partnerIds: string[] | undefined;

    if (ctx.input.role) {
      partnerIds = await client.queryEntityIds({
        serviceName,
        entitySet: 'A_BusinessPartnerRole',
        idField: 'BusinessPartner',
        filter: `BusinessPartnerRole eq ${odataStringLiteral(ctx.input.role)}`,
        top: topValue(ctx.input)
      });
    }

    let idFilters = [partnerIds]
      .filter((ids): ids is string[] => ids !== undefined)
      .map(ids => uniqueStrings(ids));

    if (idFilters.some(ids => ids.length === 0)) {
      return {
        output: {
          businessPartners: [],
          page: pageSummary(ctx.input, 0)
        },
        message: 'Retrieved **0** SAP S/4HANA business partner(s).'
      };
    }

    let intersectedIds =
      idFilters.length === 0
        ? undefined
        : idFilters.reduce((left, right) => left.filter(id => right.includes(id)));

    if (intersectedIds && intersectedIds.length === 0) {
      return {
        output: {
          businessPartners: [],
          page: pageSummary(ctx.input, 0)
        },
        message: 'Retrieved **0** SAP S/4HANA business partner(s).'
      };
    }

    let idFilter = intersectedIds
      ? orFilters(intersectedIds.map(id => `BusinessPartner eq ${odataStringLiteral(id)}`))
      : undefined;

    let result = await client.queryEntitySet<Record<string, unknown>>({
      serviceName,
      entitySet: 'A_BusinessPartner',
      pageToken: ctx.input.skipToken,
      query: {
        $top: topValue(ctx.input),
        $filter: andFilters([filters, idFilter]) || undefined,
        $orderby: ctx.input.orderBy,
        $expand: expandFor(ctx.input.expand).join(',')
      }
    });

    let businessPartners = result.items.map(mapBusinessPartner);

    return {
      output: {
        businessPartners,
        page: pageSummary(ctx.input, businessPartners.length, result.nextPageToken)
      },
      message: `Retrieved **${businessPartners.length}** SAP S/4HANA business partner(s).`
    };
  })
  .build();

export let getBusinessPartner = SlateTool.create(spec, {
  name: 'Get Business Partner',
  key: 'get_business_partner',
  description:
    'Retrieve a SAP S/4HANA business partner by id with optional addresses, roles, customer/supplier, tax, and bank metadata.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      businessPartner: z.string().min(1).describe('SAP business partner id.'),
      expand: z
        .enum(['summary', 'roles', 'addresses', 'customerSupplier', 'financial', 'all'])
        .optional()
        .describe(
          'Related business partner data to expand. Defaults to all supported read-only details.'
        )
    })
  )
  .output(
    z.object({
      businessPartner: businessPartnerSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let partner = await client.getEntity<Record<string, unknown>>({
      serviceName,
      entitySet: 'A_BusinessPartner',
      key: ctx.input.businessPartner,
      query: {
        $expand: expandFor(ctx.input.expand ?? 'all', {
          includeAddressCommunication: true
        }).join(',')
      }
    });

    let mapped = mapBusinessPartner(partner);

    return {
      output: {
        businessPartner: mapped
      },
      message: `Retrieved SAP S/4HANA business partner **${mapped.businessPartner ?? ctx.input.businessPartner}**.`
    };
  })
  .build();
