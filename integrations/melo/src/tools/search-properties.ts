import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let propertyTypeEnum = z.enum([
  'apartment',
  'house',
  'building',
  'parking',
  'office',
  'land',
  'shop'
]);
let transactionTypeEnum = z.enum(['sale', 'rent']);
let publisherTypeEnum = z.enum(['individual', 'professional']);
let sortDirectionEnum = z.enum(['asc', 'desc']);

let propertyTypeMap: Record<string, number> = {
  apartment: 0,
  house: 1,
  building: 2,
  parking: 3,
  office: 4,
  land: 5,
  shop: 6
};

let transactionTypeMap: Record<string, number> = {
  sale: 0,
  rent: 1
};

let publisherTypeMap: Record<string, number> = {
  individual: 0,
  professional: 1
};

let advertSchema = z.object({
  advertId: z.string().describe('Unique ID of the advert'),
  price: z.number().describe('Listed price'),
  surface: z.number().nullable().describe('Surface area in m²'),
  title: z.string().describe('Advert title'),
  description: z.string().describe('Advert description'),
  condominiumFees: z.number().nullable().describe('Monthly condominium fees'),
  constructionYear: z.number().nullable().describe('Year of construction'),
  energy: z
    .object({
      category: z.string(),
      value: z.number()
    })
    .nullable()
    .describe('Energy performance rating'),
  greenHouseGas: z
    .object({
      category: z.string(),
      value: z.number()
    })
    .nullable()
    .describe('Greenhouse gas emission rating'),
  contact: z
    .object({
      agency: z.string().nullable(),
      name: z.string().nullable(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
      reference: z.string().nullable()
    })
    .nullable()
    .describe('Contact information'),
  publisherName: z.string().nullable().describe('Publisher name'),
  publisherType: z.string().nullable().describe('Publisher type (individual or professional)'),
  createdAt: z.string().describe('When the advert was first seen')
});

let propertyOutputSchema = z.object({
  propertyId: z.string().describe('Unique property ID'),
  title: z.string().describe('Property title'),
  description: z.string().describe('Property description'),
  propertyType: z.string().describe('Type of property'),
  transactionType: z.string().describe('Transaction type (sale or rent)'),
  price: z.number().describe('Listed price in EUR'),
  pricePerMeter: z.number().nullable().describe('Price per square meter'),
  surface: z.number().nullable().describe('Surface area in m²'),
  landSurface: z.number().nullable().describe('Land surface area in m²'),
  bedrooms: z.number().nullable().describe('Number of bedrooms'),
  rooms: z.number().nullable().describe('Total number of rooms'),
  floor: z.number().nullable().describe('Floor number'),
  furnished: z.boolean().nullable().describe('Whether the property is furnished'),
  elevator: z.boolean().nullable().describe('Whether the building has an elevator'),
  latitude: z.number().nullable().describe('Latitude coordinate'),
  longitude: z.number().nullable().describe('Longitude coordinate'),
  cityName: z.string().nullable().describe('City name'),
  zipcode: z.string().nullable().describe('ZIP code'),
  inseeCode: z.string().nullable().describe('INSEE code'),
  pictures: z.array(z.string()).describe('Property photo URLs'),
  createdAt: z.string().describe('When the property was first listed'),
  updatedAt: z.string().describe('When the property was last updated'),
  expired: z.boolean().describe('Whether the listing has expired'),
  adverts: z.array(advertSchema).describe('Individual adverts for this property'),
  stations: z
    .array(
      z.object({
        name: z.string(),
        lines: z.array(z.string())
      })
    )
    .describe('Nearby transit stations')
});

let reversePropertyTypeMap: Record<number, string> = {
  0: 'apartment',
  1: 'house',
  2: 'building',
  3: 'parking',
  4: 'office',
  5: 'land',
  6: 'shop'
};

let reverseTransactionTypeMap: Record<number, string> = {
  0: 'sale',
  1: 'rent'
};

let reversePublisherTypeMap: Record<number, string> = {
  0: 'individual',
  1: 'professional'
};

export let mapPropertyOutput = (p: any) => ({
  propertyId: p.uuid,
  title: p.title,
  description: p.description,
  propertyType: reversePropertyTypeMap[p.propertyType] ?? String(p.propertyType),
  transactionType: reverseTransactionTypeMap[p.transactionType] ?? String(p.transactionType),
  price: p.price,
  pricePerMeter: p.pricePerMeter ?? null,
  surface: p.surface ?? null,
  landSurface: p.landSurface ?? null,
  bedrooms: p.bedroom ?? null,
  rooms: p.room ?? null,
  floor: p.floor ?? null,
  furnished: p.furnished ?? null,
  elevator: p.elevator ?? null,
  latitude: p.locations?.lat ?? null,
  longitude: p.locations?.lon ?? null,
  cityName: p.city?.name ?? null,
  zipcode: p.city?.zipcode ?? null,
  inseeCode: p.city?.insee ?? null,
  pictures: [...(p.pictures ?? []), ...(p.picturesRemote ?? [])],
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
  expired: p.expired ?? false,
  adverts: (p.adverts ?? []).map((a: any) => ({
    advertId: a.uuid,
    price: a.price,
    surface: a.surface ?? null,
    title: a.title,
    description: a.description,
    condominiumFees: a.condominiumFees ?? null,
    constructionYear: a.constructionYear ?? null,
    energy: a.energy ?? null,
    greenHouseGas: a.greenHouseGas ?? null,
    contact: a.contact
      ? {
          agency: a.contact.agency ?? null,
          name: a.contact.name ?? null,
          email: a.contact.email ?? null,
          phone: a.contact.phone ?? null,
          reference: a.contact.reference ?? null
        }
      : null,
    publisherName: a.publisher?.name ?? null,
    publisherType: a.publisher
      ? (reversePublisherTypeMap[a.publisher.type] ?? String(a.publisher.type))
      : null,
    createdAt: a.createdAt
  })),
  stations: (p.stations ?? []).map((s: any) => ({
    name: s.name,
    lines: (s.lines ?? []).map((l: any) => l.number)
  }))
});

export { propertyOutputSchema };

export let searchProperties = SlateTool.create(spec, {
  name: 'Search Properties',
  key: 'search_properties',
  description: `Search for real estate property listings across France. Properties are deduplicated from 900+ sources.
Filter by location, price, surface area, property type, transaction type, and more.
Results include price, location, photos, energy ratings, contact info, and nearby transit.`,
  instructions: [
    'Use location filters (city, department, zipcode, or lat/lon with radius) to narrow results geographically.',
    'Set itemsPerPage to 0 to get only the count of matching properties without returning listings.',
    'Use expressions for full-text keyword search within property titles and descriptions.'
  ],
  constraints: ['Maximum 30 items per page.', 'Total count is capped at 10,000.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      transactionType: transactionTypeEnum.describe('Filter by transaction type'),
      propertyTypes: z.array(propertyTypeEnum).optional().describe('Filter by property types'),
      budgetMin: z.number().optional().describe('Minimum price in EUR'),
      budgetMax: z.number().optional().describe('Maximum price in EUR'),
      surfaceMin: z.number().optional().describe('Minimum surface area in m²'),
      surfaceMax: z.number().optional().describe('Maximum surface area in m²'),
      bedroomMin: z.number().optional().describe('Minimum number of bedrooms'),
      bedroomMax: z.number().optional().describe('Maximum number of bedrooms'),
      roomMin: z.number().optional().describe('Minimum number of rooms'),
      roomMax: z.number().optional().describe('Maximum number of rooms'),
      includedCities: z
        .array(z.string())
        .optional()
        .describe('City IRIs to include (e.g. "cities/12345")'),
      excludedCities: z.array(z.string()).optional().describe('City IRIs to exclude'),
      includedDepartments: z
        .array(z.string())
        .optional()
        .describe('Department IRIs to include (e.g. "departments/75")'),
      includedZipcodes: z.array(z.string()).optional().describe('Zipcodes to include'),
      excludedZipcodes: z.array(z.string()).optional().describe('Zipcodes to exclude'),
      includedInseeCodes: z.array(z.string()).optional().describe('INSEE codes to include'),
      excludedInseeCodes: z.array(z.string()).optional().describe('INSEE codes to exclude'),
      latitude: z.number().optional().describe('Center latitude for radius search'),
      longitude: z.number().optional().describe('Center longitude for radius search'),
      radius: z.number().optional().describe('Search radius in km (requires lat/lon)'),
      pricePerMeterMin: z.number().optional().describe('Minimum price per m²'),
      pricePerMeterMax: z.number().optional().describe('Maximum price per m²'),
      publisherTypes: z
        .array(publisherTypeEnum)
        .optional()
        .describe('Filter by publisher type'),
      furnished: z.boolean().optional().describe('Filter by furnished status'),
      withVirtualTour: z
        .boolean()
        .optional()
        .describe('Only include properties with virtual tours'),
      expressions: z
        .array(z.string())
        .optional()
        .describe('Full-text search expressions for titles/descriptions'),
      fromDate: z
        .string()
        .optional()
        .describe('Only properties created after this date (ISO 8601)'),
      toDate: z
        .string()
        .optional()
        .describe('Only properties created before this date (ISO 8601)'),
      expired: z.boolean().optional().describe('Filter by expired status. null returns all.'),
      sortBy: z
        .enum(['createdAt', 'updatedAt', 'price', 'surface', 'pricePerMeter'])
        .optional()
        .describe('Field to sort by'),
      sortDirection: sortDirectionEnum.optional().describe('Sort direction'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      itemsPerPage: z
        .number()
        .optional()
        .describe('Results per page (max 30, use 0 for count only)')
    })
  )
  .output(
    z.object({
      totalItems: z
        .number()
        .describe('Total number of matching properties (capped at 10,000)'),
      properties: z.array(propertyOutputSchema).describe('List of matching properties'),
      hasNextPage: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let params: Record<string, unknown> = {
      transactionType: transactionTypeMap[ctx.input.transactionType]
    };

    if (ctx.input.propertyTypes) {
      params['propertyTypes[]'] = ctx.input.propertyTypes.map(t => propertyTypeMap[t]);
    }
    if (ctx.input.budgetMin !== undefined) params.budgetMin = ctx.input.budgetMin;
    if (ctx.input.budgetMax !== undefined) params.budgetMax = ctx.input.budgetMax;
    if (ctx.input.surfaceMin !== undefined) params.surfaceMin = ctx.input.surfaceMin;
    if (ctx.input.surfaceMax !== undefined) params.surfaceMax = ctx.input.surfaceMax;
    if (ctx.input.bedroomMin !== undefined) params.bedroomMin = ctx.input.bedroomMin;
    if (ctx.input.bedroomMax !== undefined) params.bedroomMax = ctx.input.bedroomMax;
    if (ctx.input.roomMin !== undefined) params.roomMin = ctx.input.roomMin;
    if (ctx.input.roomMax !== undefined) params.roomMax = ctx.input.roomMax;
    if (ctx.input.includedCities) params['includedCities[]'] = ctx.input.includedCities;
    if (ctx.input.excludedCities) params['excludedCities[]'] = ctx.input.excludedCities;
    if (ctx.input.includedDepartments)
      params['includedDepartments[]'] = ctx.input.includedDepartments;
    if (ctx.input.includedZipcodes) params['includedZipcodes[]'] = ctx.input.includedZipcodes;
    if (ctx.input.excludedZipcodes) params['excludedZipcodes[]'] = ctx.input.excludedZipcodes;
    if (ctx.input.includedInseeCodes)
      params['includedInseeCodes[]'] = ctx.input.includedInseeCodes;
    if (ctx.input.excludedInseeCodes)
      params['excludedInseeCodes[]'] = ctx.input.excludedInseeCodes;
    if (ctx.input.latitude !== undefined) params.lat = ctx.input.latitude;
    if (ctx.input.longitude !== undefined) params.lon = ctx.input.longitude;
    if (ctx.input.radius !== undefined) params.radius = ctx.input.radius;
    if (ctx.input.pricePerMeterMin !== undefined)
      params.pricePerMeterMin = ctx.input.pricePerMeterMin;
    if (ctx.input.pricePerMeterMax !== undefined)
      params.pricePerMeterMax = ctx.input.pricePerMeterMax;
    if (ctx.input.publisherTypes) {
      params['publisherTypes[]'] = ctx.input.publisherTypes.map(t => publisherTypeMap[t]);
    }
    if (ctx.input.furnished !== undefined) params.furnished = ctx.input.furnished;
    if (ctx.input.withVirtualTour !== undefined)
      params.withVirtualTour = ctx.input.withVirtualTour;
    if (ctx.input.expressions) params['expressions[]'] = ctx.input.expressions;
    if (ctx.input.fromDate) params.fromDate = ctx.input.fromDate;
    if (ctx.input.toDate) params.toDate = ctx.input.toDate;
    if (ctx.input.expired !== undefined) params.expired = ctx.input.expired;
    if (ctx.input.page !== undefined) params.page = ctx.input.page;
    if (ctx.input.itemsPerPage !== undefined) params.itemsPerPage = ctx.input.itemsPerPage;
    if (ctx.input.sortBy && ctx.input.sortDirection) {
      params[`order[${ctx.input.sortBy}]`] = ctx.input.sortDirection;
    }

    let result = await client.searchProperties(params);
    let properties = (result['hydra:member'] ?? []).map(mapPropertyOutput);
    let hasNextPage = !!result['hydra:view']?.['hydra:next'];

    return {
      output: {
        totalItems: result['hydra:totalItems'],
        properties,
        hasNextPage
      },
      message: `Found **${result['hydra:totalItems']}** properties matching the search criteria. Returned **${properties.length}** results${hasNextPage ? ' (more pages available)' : ''}.`
    };
  })
  .build();
