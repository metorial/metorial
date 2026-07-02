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
let subscribedEventEnum = z.enum([
  'property.ad.create',
  'property.ad.update',
  'ad.update.price',
  'ad.update.surface',
  'ad.update.pictures',
  'ad.update.expired'
]);

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

let savedSearchOutputSchema = z.object({
  searchId: z.string().describe('UUID of the saved search'),
  title: z.string().describe('Name of the saved search'),
  propertyTypes: z.array(z.string()).describe('Property types being monitored'),
  transactionType: z.string().describe('Transaction type (sale or rent)'),
  budgetMin: z.number().nullable().describe('Minimum budget filter'),
  budgetMax: z.number().nullable().describe('Maximum budget filter'),
  surfaceMin: z.number().nullable().describe('Minimum surface filter'),
  surfaceMax: z.number().nullable().describe('Maximum surface filter'),
  notificationEnabled: z.boolean().describe('Whether notifications are active'),
  subscribedEvents: z.array(z.string()).describe('Event types subscribed to'),
  endpointRecipient: z.string().nullable().describe('Webhook URL for new match notifications'),
  eventEndpoint: z.string().nullable().describe('Webhook URL for advert events'),
  createdAt: z.string().optional().describe('When the search was created'),
  updatedAt: z.string().optional().describe('When the search was last updated')
});

let mapSearchOutput = (s: any) => ({
  searchId: s.uuid ?? s['@id']?.split('/').pop() ?? '',
  title: s.title,
  propertyTypes: (s.propertyTypes ?? []).map(
    (t: number) => reversePropertyTypeMap[t] ?? String(t)
  ),
  transactionType: reverseTransactionTypeMap[s.transactionType] ?? String(s.transactionType),
  budgetMin: s.budgetMin ?? null,
  budgetMax: s.budgetMax ?? null,
  surfaceMin: s.surfaceMin ?? null,
  surfaceMax: s.surfaceMax ?? null,
  notificationEnabled: s.notificationEnabled ?? false,
  subscribedEvents: s.subscribedEvents ?? [],
  endpointRecipient: s.endpointRecipient ?? null,
  eventEndpoint: s.eventEndpoint ?? null,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt
});

export let createSavedSearch = SlateTool.create(spec, {
  name: 'Create Saved Search',
  key: 'create_saved_search',
  description: `Create a new saved search to monitor property listings matching specific criteria. When notifications are enabled, new matches and advert events can be delivered via webhook.
Configure **endpointRecipient** to receive new property match notifications and **eventEndpoint** to receive advert-level events.`,
  instructions: [
    'Set notificationEnabled to true to activate webhook/email notifications.',
    'Use subscribedEvents to choose which advert events to receive at the eventEndpoint.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Name for the saved search'),
      transactionType: transactionTypeEnum.describe('Transaction type to search for'),
      propertyTypes: z.array(propertyTypeEnum).describe('Property types to include'),
      budgetMin: z.number().optional().describe('Minimum price in EUR'),
      budgetMax: z.number().optional().describe('Maximum price in EUR'),
      surfaceMin: z.number().optional().describe('Minimum surface area in m²'),
      surfaceMax: z.number().optional().describe('Maximum surface area in m²'),
      bedroomMin: z.number().optional().describe('Minimum bedrooms'),
      roomMin: z.number().optional().describe('Minimum rooms'),
      roomMax: z.number().optional().describe('Maximum rooms'),
      latitude: z.number().optional().describe('Center latitude for radius search'),
      longitude: z.number().optional().describe('Center longitude for radius search'),
      radius: z.number().optional().describe('Search radius in km'),
      includedCities: z.array(z.string()).optional().describe('City IRIs to include'),
      includedDepartments: z
        .array(z.string())
        .optional()
        .describe('Department IRIs to include'),
      includedZipcodes: z.array(z.string()).optional().describe('Zipcodes to include'),
      excludedCities: z.array(z.string()).optional().describe('City IRIs to exclude'),
      publisherTypes: z.array(publisherTypeEnum).optional().describe('Publisher type filter'),
      pricePerMeterMin: z.number().optional().describe('Minimum price per m²'),
      pricePerMeterMax: z.number().optional().describe('Maximum price per m²'),
      furnished: z.boolean().optional().describe('Furnished filter'),
      withVirtualTour: z.boolean().optional().describe('Virtual tour filter'),
      expressions: z.array(z.string()).optional().describe('Full-text search expressions'),
      notificationEnabled: z
        .boolean()
        .optional()
        .describe('Enable webhook/email notifications'),
      endpointRecipient: z
        .string()
        .optional()
        .describe('HTTPS webhook URL for new property match notifications'),
      eventEndpoint: z
        .string()
        .optional()
        .describe('HTTPS webhook URL for advert event notifications'),
      subscribedEvents: z
        .array(subscribedEventEnum)
        .optional()
        .describe('Advert event types to subscribe to'),
      notificationRecipient: z
        .string()
        .optional()
        .describe('Email address for email notifications')
    })
  )
  .output(savedSearchOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let body: Record<string, unknown> = {
      title: ctx.input.title,
      transactionType: transactionTypeMap[ctx.input.transactionType],
      propertyTypes: ctx.input.propertyTypes.map(t => propertyTypeMap[t])
    };

    if (ctx.input.budgetMin !== undefined) body.budgetMin = ctx.input.budgetMin;
    if (ctx.input.budgetMax !== undefined) body.budgetMax = ctx.input.budgetMax;
    if (ctx.input.surfaceMin !== undefined) body.surfaceMin = ctx.input.surfaceMin;
    if (ctx.input.surfaceMax !== undefined) body.surfaceMax = ctx.input.surfaceMax;
    if (ctx.input.bedroomMin !== undefined) body.bedroomMin = ctx.input.bedroomMin;
    if (ctx.input.roomMin !== undefined) body.roomMin = ctx.input.roomMin;
    if (ctx.input.roomMax !== undefined) body.roomMax = ctx.input.roomMax;
    if (ctx.input.latitude !== undefined) body.lat = ctx.input.latitude;
    if (ctx.input.longitude !== undefined) body.lon = ctx.input.longitude;
    if (ctx.input.radius !== undefined) body.radius = ctx.input.radius;
    if (ctx.input.includedCities) body.includedCities = ctx.input.includedCities;
    if (ctx.input.includedDepartments)
      body.includedDepartments = ctx.input.includedDepartments;
    if (ctx.input.includedZipcodes) body.includedZipcodes = ctx.input.includedZipcodes;
    if (ctx.input.excludedCities) body.excludedCities = ctx.input.excludedCities;
    if (ctx.input.publisherTypes) {
      body.publisherTypes = ctx.input.publisherTypes.map(t => publisherTypeMap[t]);
    }
    if (ctx.input.pricePerMeterMin !== undefined)
      body.pricePerMeterMin = ctx.input.pricePerMeterMin;
    if (ctx.input.pricePerMeterMax !== undefined)
      body.pricePerMeterMax = ctx.input.pricePerMeterMax;
    if (ctx.input.furnished !== undefined) body.furnished = ctx.input.furnished;
    if (ctx.input.withVirtualTour !== undefined)
      body.withVirtualTour = ctx.input.withVirtualTour;
    if (ctx.input.expressions) body.expressions = ctx.input.expressions;
    if (ctx.input.notificationEnabled !== undefined)
      body.notificationEnabled = ctx.input.notificationEnabled;
    if (ctx.input.endpointRecipient) body.endpointRecipient = ctx.input.endpointRecipient;
    if (ctx.input.eventEndpoint) body.eventEndpoint = ctx.input.eventEndpoint;
    if (ctx.input.subscribedEvents) body.subscribedEvents = ctx.input.subscribedEvents;
    if (ctx.input.notificationRecipient)
      body.notificationRecipient = ctx.input.notificationRecipient;

    let search = await client.createSearch(body);
    let output = mapSearchOutput(search);

    return {
      output,
      message: `Created saved search **${output.title}** (${output.searchId}) for ${output.transactionType} of ${output.propertyTypes.join(', ')}. Notifications: ${output.notificationEnabled ? 'enabled' : 'disabled'}.`
    };
  })
  .build();

export let updateSavedSearch = SlateTool.create(spec, {
  name: 'Update Saved Search',
  key: 'update_saved_search',
  description: `Update an existing saved search with new criteria or notification settings. Requires the search ID and the full updated configuration. All required fields (title, transactionType, propertyTypes) must be provided.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      searchId: z.string().describe('UUID of the saved search to update'),
      title: z.string().describe('Updated name for the saved search'),
      transactionType: transactionTypeEnum.describe('Transaction type'),
      propertyTypes: z.array(propertyTypeEnum).describe('Property types to include'),
      budgetMin: z.number().optional().describe('Minimum price in EUR'),
      budgetMax: z.number().optional().describe('Maximum price in EUR'),
      surfaceMin: z.number().optional().describe('Minimum surface area in m²'),
      surfaceMax: z.number().optional().describe('Maximum surface area in m²'),
      bedroomMin: z.number().optional().describe('Minimum bedrooms'),
      roomMin: z.number().optional().describe('Minimum rooms'),
      roomMax: z.number().optional().describe('Maximum rooms'),
      latitude: z.number().optional().describe('Center latitude for radius search'),
      longitude: z.number().optional().describe('Center longitude for radius search'),
      radius: z.number().optional().describe('Search radius in km'),
      includedCities: z.array(z.string()).optional().describe('City IRIs to include'),
      includedDepartments: z
        .array(z.string())
        .optional()
        .describe('Department IRIs to include'),
      includedZipcodes: z.array(z.string()).optional().describe('Zipcodes to include'),
      excludedCities: z.array(z.string()).optional().describe('City IRIs to exclude'),
      publisherTypes: z.array(publisherTypeEnum).optional().describe('Publisher type filter'),
      furnished: z.boolean().optional().describe('Furnished filter'),
      withVirtualTour: z.boolean().optional().describe('Virtual tour filter'),
      expressions: z.array(z.string()).optional().describe('Full-text search expressions'),
      notificationEnabled: z
        .boolean()
        .optional()
        .describe('Enable webhook/email notifications'),
      endpointRecipient: z
        .string()
        .optional()
        .describe('HTTPS webhook URL for new match notifications'),
      eventEndpoint: z.string().optional().describe('HTTPS webhook URL for advert events'),
      subscribedEvents: z
        .array(subscribedEventEnum)
        .optional()
        .describe('Advert event types to subscribe to'),
      notificationRecipient: z.string().optional().describe('Email for email notifications')
    })
  )
  .output(savedSearchOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let body: Record<string, unknown> = {
      title: ctx.input.title,
      transactionType: transactionTypeMap[ctx.input.transactionType],
      propertyTypes: ctx.input.propertyTypes.map(t => propertyTypeMap[t])
    };

    if (ctx.input.budgetMin !== undefined) body.budgetMin = ctx.input.budgetMin;
    if (ctx.input.budgetMax !== undefined) body.budgetMax = ctx.input.budgetMax;
    if (ctx.input.surfaceMin !== undefined) body.surfaceMin = ctx.input.surfaceMin;
    if (ctx.input.surfaceMax !== undefined) body.surfaceMax = ctx.input.surfaceMax;
    if (ctx.input.bedroomMin !== undefined) body.bedroomMin = ctx.input.bedroomMin;
    if (ctx.input.roomMin !== undefined) body.roomMin = ctx.input.roomMin;
    if (ctx.input.roomMax !== undefined) body.roomMax = ctx.input.roomMax;
    if (ctx.input.latitude !== undefined) body.lat = ctx.input.latitude;
    if (ctx.input.longitude !== undefined) body.lon = ctx.input.longitude;
    if (ctx.input.radius !== undefined) body.radius = ctx.input.radius;
    if (ctx.input.includedCities) body.includedCities = ctx.input.includedCities;
    if (ctx.input.includedDepartments)
      body.includedDepartments = ctx.input.includedDepartments;
    if (ctx.input.includedZipcodes) body.includedZipcodes = ctx.input.includedZipcodes;
    if (ctx.input.excludedCities) body.excludedCities = ctx.input.excludedCities;
    if (ctx.input.publisherTypes) {
      body.publisherTypes = ctx.input.publisherTypes.map(t => publisherTypeMap[t]);
    }
    if (ctx.input.furnished !== undefined) body.furnished = ctx.input.furnished;
    if (ctx.input.withVirtualTour !== undefined)
      body.withVirtualTour = ctx.input.withVirtualTour;
    if (ctx.input.expressions) body.expressions = ctx.input.expressions;
    if (ctx.input.notificationEnabled !== undefined)
      body.notificationEnabled = ctx.input.notificationEnabled;
    if (ctx.input.endpointRecipient) body.endpointRecipient = ctx.input.endpointRecipient;
    if (ctx.input.eventEndpoint) body.eventEndpoint = ctx.input.eventEndpoint;
    if (ctx.input.subscribedEvents) body.subscribedEvents = ctx.input.subscribedEvents;
    if (ctx.input.notificationRecipient)
      body.notificationRecipient = ctx.input.notificationRecipient;

    let search = await client.updateSearch(ctx.input.searchId, body);
    let output = mapSearchOutput(search);

    return {
      output,
      message: `Updated saved search **${output.title}** (${output.searchId}).`
    };
  })
  .build();

export let deleteSavedSearch = SlateTool.create(spec, {
  name: 'Delete Saved Search',
  key: 'delete_saved_search',
  description: `Delete a saved search by its ID. This permanently removes the search and stops any associated webhook notifications.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      searchId: z.string().describe('UUID of the saved search to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the search was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    await client.deleteSearch(ctx.input.searchId);

    return {
      output: { deleted: true },
      message: `Deleted saved search \`${ctx.input.searchId}\`.`
    };
  })
  .build();
