import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { categorySchema, coordinatesSchema, locationSchema } from './search-businesses';

let hoursSchema = z.object({
  hoursType: z.string().optional().describe('Type of hours (e.g., "REGULAR")'),
  isOpenNow: z.boolean().optional().describe('Whether the business is currently open'),
  open: z
    .array(
      z.object({
        day: z.number().describe('Day of week (0=Monday, 6=Sunday)'),
        start: z.string().describe('Start time in 24hr format (e.g., "1000")'),
        end: z.string().describe('End time in 24hr format (e.g., "2300")'),
        isOvernight: z.boolean().optional().describe('Whether the hours span past midnight')
      })
    )
    .optional()
    .describe('Operating hours schedule')
});

let businessDetailsSchema = z.object({
  businessId: z.string().describe('Unique Yelp business ID'),
  alias: z.string().describe('Business alias for URL-friendly identification'),
  name: z.string().describe('Business name'),
  imageUrl: z.string().optional().describe('URL of the main business photo'),
  isClaimed: z.boolean().optional().describe('Whether the business is claimed by an owner'),
  isClosed: z.boolean().optional().describe('Whether the business has permanently closed'),
  url: z.string().optional().describe('Yelp URL for the business'),
  phone: z.string().optional().describe('Phone number in E.164 format'),
  displayPhone: z.string().optional().describe('Formatted phone number'),
  reviewCount: z.number().optional().describe('Number of reviews'),
  categories: z.array(categorySchema).optional().describe('Business categories'),
  rating: z.number().optional().describe('Yelp rating (1-5)'),
  coordinates: coordinatesSchema.optional().describe('Business coordinates'),
  transactions: z.array(z.string()).optional().describe('Supported transactions'),
  price: z.string().optional().describe('Price level ($ to $$$$)'),
  location: locationSchema.optional().describe('Business location'),
  photos: z.array(z.string()).optional().describe('URLs of business photos'),
  hours: z.array(hoursSchema).optional().describe('Business operating hours'),
  specialHours: z
    .array(
      z.object({
        date: z.string().optional().describe('Date in YYYY-MM-DD format'),
        start: z.string().nullable().optional().describe('Start time'),
        end: z.string().nullable().optional().describe('End time'),
        isClosed: z.boolean().optional().describe('Whether closed on this date'),
        isOvernight: z.boolean().optional().describe('Whether hours span overnight')
      })
    )
    .optional()
    .describe('Special hours (holidays, etc.)'),
  messaging: z
    .object({
      url: z.string().optional().describe('Messaging URL'),
      useCaseText: z.string().optional().describe('Suggested use case text'),
      responseRate: z.number().optional().describe('Response rate percentage'),
      responseTime: z.number().optional().describe('Average response time in seconds'),
      isEnabled: z.boolean().optional().describe('Whether messaging is enabled')
    })
    .optional()
    .describe('Business messaging information')
});

export let getBusinessDetails = SlateTool.create(spec, {
  name: 'Get Business Details',
  key: 'get_business_details',
  description: `Retrieve detailed information about a specific Yelp business. Returns comprehensive data including name, address, phone, photos, rating, price level, hours of operation, special hours, messaging info, and business attributes. You can look up a business by its Yelp business ID or its URL alias.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      businessIdOrAlias: z
        .string()
        .describe(
          'Yelp business ID or alias (e.g., "gary-danko-san-francisco" or "WavvLdfdP6g8aZTtbBQHTw")'
        ),
      locale: z.string().optional().describe('Locale code (e.g., "en_US")')
    })
  )
  .output(businessDetailsSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let b = await client.getBusinessDetails(ctx.input.businessIdOrAlias, ctx.input.locale);

    let output = {
      businessId: b.id,
      alias: b.alias,
      name: b.name,
      imageUrl: b.image_url,
      isClaimed: b.is_claimed,
      isClosed: b.is_closed,
      url: b.url,
      phone: b.phone,
      displayPhone: b.display_phone,
      reviewCount: b.review_count,
      categories: b.categories,
      rating: b.rating,
      coordinates: b.coordinates,
      transactions: b.transactions,
      price: b.price,
      location: b.location
        ? {
            address1: b.location.address1,
            address2: b.location.address2,
            address3: b.location.address3,
            city: b.location.city,
            zipCode: b.location.zip_code,
            country: b.location.country,
            state: b.location.state,
            displayAddress: b.location.display_address
          }
        : undefined,
      photos: b.photos,
      hours: b.hours?.map((h: any) => ({
        hoursType: h.hours_type,
        isOpenNow: h.is_open_now,
        open: h.open?.map((o: any) => ({
          day: o.day,
          start: o.start,
          end: o.end,
          isOvernight: o.is_overnight
        }))
      })),
      specialHours: b.special_hours?.map((sh: any) => ({
        date: sh.date,
        start: sh.start,
        end: sh.end,
        isClosed: sh.is_closed,
        isOvernight: sh.is_overnight
      })),
      messaging: b.messaging
        ? {
            url: b.messaging.url,
            useCaseText: b.messaging.use_case_text,
            responseRate: b.messaging.response_rate,
            responseTime: b.messaging.response_time,
            isEnabled: b.messaging.is_enabled
          }
        : undefined
    };

    let statusParts: string[] = [`**${b.name}**`];
    if (b.rating) statusParts.push(`${b.rating}★`);
    if (b.review_count) statusParts.push(`(${b.review_count} reviews)`);
    if (b.price) statusParts.push(`· ${b.price}`);
    if (b.location?.display_address)
      statusParts.push(`\n📍 ${b.location.display_address.join(', ')}`);

    return {
      output,
      message: statusParts.join(' ')
    };
  })
  .build();
