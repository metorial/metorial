import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let aiBusinessSchema = z.object({
  businessId: z.string().describe('Yelp business ID'),
  alias: z.string().optional().describe('Business alias'),
  name: z.string().describe('Business name'),
  url: z.string().optional().describe('Yelp URL'),
  rating: z.number().optional().describe('Yelp rating'),
  reviewCount: z.number().optional().describe('Number of reviews'),
  price: z.string().optional().describe('Price level'),
  categories: z
    .array(
      z.object({
        alias: z.string(),
        title: z.string()
      })
    )
    .optional()
    .describe('Business categories'),
  phone: z.string().optional().describe('Phone number'),
  location: z
    .object({
      address1: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      state: z.string().nullable().optional(),
      zipCode: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
      formattedAddress: z.string().nullable().optional()
    })
    .optional()
    .describe('Business location'),
  coordinates: z
    .object({
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional()
    })
    .optional()
    .describe('Business coordinates')
});

export let aiChat = SlateTool.create(spec, {
  name: 'AI Chat',
  key: 'ai_chat',
  description: `Have a conversational interaction with Yelp's AI for local business discovery. Send natural language queries like "Best sushi near downtown" and receive natural language responses along with structured business data. Supports multi-turn conversations by passing back the chatId from a previous response.`,
  instructions: [
    'For the first message in a conversation, omit the chatId. Use the returned chatId for follow-up messages.',
    'Providing latitude/longitude helps get location-relevant results.'
  ],
  constraints: ['Requires a Premium plan API key.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe('Natural language query (e.g., "Find the best pizza places near me")'),
      chatId: z
        .string()
        .optional()
        .describe('Session ID from a previous response for multi-turn conversations'),
      latitude: z.number().optional().describe('User latitude for location context'),
      longitude: z.number().optional().describe('User longitude for location context'),
      locale: z.string().optional().describe('User locale (e.g., "en_US")')
    })
  )
  .output(
    z.object({
      responseText: z.string().describe('Natural language response from Yelp AI'),
      chatId: z.string().optional().describe('Session ID for continuing the conversation'),
      types: z
        .array(z.string())
        .optional()
        .describe('Response types (e.g., "business_search")'),
      businesses: z
        .array(aiBusinessSchema)
        .optional()
        .describe('Businesses referenced in the response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.aiChat({
      query: ctx.input.query,
      chatId: ctx.input.chatId,
      latitude: ctx.input.latitude,
      longitude: ctx.input.longitude,
      locale: ctx.input.locale
    });

    let businesses: any[] = [];
    if (result.entities) {
      for (let entity of result.entities) {
        if (entity.businesses) {
          for (let b of entity.businesses) {
            businesses.push({
              businessId: b.id,
              alias: b.alias,
              name: b.name,
              url: b.url,
              rating: b.rating,
              reviewCount: b.review_count,
              price: b.price,
              categories: b.categories,
              phone: b.phone,
              location: b.location
                ? {
                    address1: b.location.address1,
                    city: b.location.city,
                    state: b.location.state,
                    zipCode: b.location.zip_code,
                    country: b.location.country,
                    formattedAddress: b.location.formatted_address
                  }
                : undefined,
              coordinates: b.coordinates
            });
          }
        }
      }
    }

    return {
      output: {
        responseText: result.response?.text || '',
        chatId: result.chat_id,
        types: result.types,
        businesses
      },
      message: result.response?.text || 'Received AI response.'
    };
  })
  .build();
