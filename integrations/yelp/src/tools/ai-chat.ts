import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapYelpOutput } from '../lib/response';
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
        alias: z.string().optional(),
        title: z.string().optional()
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

let outputSchema = z.object({
  rawResult: z
    .record(z.string(), z.unknown())
    .describe('Complete response returned by Yelp, including original nullable fields'),
  responseText: z.string().optional().describe('Natural language response from Yelp AI'),
  chatId: z.string().optional().describe('Session ID for continuing the conversation'),
  types: z.array(z.string()).optional().describe('Response types (e.g., "business_search")'),
  businesses: z
    .array(aiBusinessSchema)
    .optional()
    .describe('Businesses referenced in the response')
});

export let aiChat = SlateTool.create(spec, {
  name: 'AI Chat',
  key: 'ai_chat',
  description: `Have a conversational interaction with Yelp's AI for local business discovery. Send natural language queries like "Best sushi near downtown" and receive natural language responses along with structured business data. Supports multi-turn conversations by passing back the chatId from a previous response.`,
  instructions: [
    'For the first message in a conversation, omit the chatId. Use the returned chatId for follow-up messages.',
    'Providing latitude/longitude helps get location-relevant results.'
  ],
  constraints: [
    'Requires a Yelp API key with AI API access. Availability and optional reservation capabilities depend on Yelp approval and the API plan.',
    'For accounts enabled for reservations, conversational requests can book tables.'
  ],
  tags: {
    readOnly: false
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
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.aiChat({
      query: ctx.input.query,
      chatId: ctx.input.chatId,
      latitude: ctx.input.latitude,
      longitude: ctx.input.longitude,
      locale: ctx.input.locale
    });

    return mapYelpOutput(outputSchema, () => {
      if (result.response?.text === undefined && result.entities === undefined) {
        throw createApiServiceError(
          'Yelp AI returned neither response text nor structured entities.',
          { reason: 'yelp_invalid_response' }
        );
      }
      if (result.response !== undefined && !isApiErrorRecord(result.response)) {
        throw createApiServiceError('Yelp AI returned invalid response metadata.', {
          reason: 'yelp_invalid_response'
        });
      }
      let businesses: z.infer<typeof aiBusinessSchema>[] | undefined;
      if (result.entities !== undefined) {
        if (!Array.isArray(result.entities)) {
          throw createApiServiceError('Yelp AI returned invalid entities.', {
            reason: 'yelp_invalid_response'
          });
        }
        for (let entity of result.entities) {
          if (!isApiErrorRecord(entity as unknown)) {
            throw createApiServiceError('Yelp AI returned an invalid entity.', {
              reason: 'yelp_invalid_response'
            });
          }
          if (entity.businesses !== undefined) {
            if (!Array.isArray(entity.businesses)) {
              throw createApiServiceError('Yelp AI returned invalid business entities.', {
                reason: 'yelp_invalid_response'
              });
            }
            businesses ??= [];
            for (let b of entity.businesses) {
              if (!isApiErrorRecord(b as unknown)) {
                throw createApiServiceError('Yelp AI returned an invalid business.', {
                  reason: 'yelp_invalid_response'
                });
              }
              businesses.push({
                businessId: b.id,
                alias: b.alias,
                name: b.name,
                url: b.url,
                rating: b.rating ?? undefined,
                reviewCount: b.review_count,
                price: b.price ?? undefined,
                categories: b.categories,
                phone: b.phone ?? undefined,
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
                coordinates: b.coordinates ?? undefined
              });
            }
          }
        }
      }

      return {
        output: {
          rawResult: result,
          responseText: result.response?.text,
          chatId: result.chat_id,
          types: result.types,
          businesses
        },
        message: result.response?.text ?? 'Received structured AI response.'
      };
    });
  })
  .build();
