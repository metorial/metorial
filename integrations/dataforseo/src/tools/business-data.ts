import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { dataForSEOServiceError } from '../lib/errors';
import { spec } from '../spec';

let businessListingSchema = z
  .object({
    title: z.string().optional().describe('Business title'),
    category: z.string().optional().describe('Primary business category'),
    cid: z.string().optional().describe('Google client ID for the business'),
    address: z.string().optional().describe('Business address'),
    phone: z.string().optional().describe('Primary phone number when available'),
    ratingValue: z.number().optional().describe('Rating value'),
    votesCount: z.number().optional().describe('Number of rating votes')
  })
  .passthrough();

export let businessData = SlateTool.create(spec, {
  name: 'Business Data',
  key: 'business_data',
  description: `Search DataForSEO Business Listings live data or create Google Reviews tasks. Use business listings for Google Maps business entity discovery and Google Reviews when you need review data for a known business query.`,
  instructions: [
    'Use action "business_listings_search" for live business listing search by category, title, description, and location.',
    'Use action "google_reviews" with keyword plus location and language to create a Google Reviews task.',
    'Use the returned Google Reviews taskId with Get Task Result and endpoint "google_reviews".'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['business_listings_search', 'google_reviews'])
        .describe('Business Data action to run'),
      categories: z
        .array(z.string())
        .optional()
        .describe(
          'Business categories for business_listings_search, e.g. ["pizza_restaurant"]'
        ),
      title: z.string().optional().describe('Business title/name filter for listings search'),
      description: z
        .string()
        .optional()
        .describe('Business description filter for listings search'),
      isClaimed: z.boolean().optional().describe('Filter listings by claimed status'),
      keyword: z.string().optional().describe('Business query. Required for google_reviews.'),
      locationName: z.string().optional().describe('Location name'),
      locationCode: z.number().optional().describe('DataForSEO location code'),
      locationCoordinate: z
        .string()
        .optional()
        .describe('GPS coordinates in latitude,longitude,radius format'),
      languageName: z.string().optional().describe('Language name for google_reviews'),
      languageCode: z.string().optional().describe('Language code for google_reviews'),
      limit: z.number().optional().describe('Maximum listings to return'),
      offset: z.number().optional().describe('Listings pagination offset'),
      offsetToken: z
        .string()
        .optional()
        .describe('Offset token for subsequent listing requests'),
      filters: z.array(z.any()).optional().describe('Business Listings filters'),
      orderBy: z.array(z.string()).optional().describe('Business Listings sort rules'),
      depth: z.number().optional().describe('Number of reviews to request for google_reviews'),
      sortBy: z.string().optional().describe('Review sort mode for google_reviews')
    })
  )
  .output(
    z.object({
      action: z.string().describe('Business Data action run'),
      taskId: z.string().optional().describe('Task ID for google_reviews'),
      statusMessage: z.string().optional().describe('Task status message for google_reviews'),
      totalCount: z.number().optional().describe('Total matching business listings'),
      offsetToken: z
        .string()
        .optional()
        .describe('Offset token for subsequent listing requests'),
      listings: z.array(businessListingSchema).optional().describe('Business listing results'),
      cost: z.number().optional().describe('API cost')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'business_listings_search') {
      let response = await client.businessListingsSearchLive({
        categories: ctx.input.categories,
        description: ctx.input.description,
        title: ctx.input.title,
        isClaimed: ctx.input.isClaimed,
        locationName: ctx.input.locationName,
        locationCode: ctx.input.locationCode,
        locationCoordinate: ctx.input.locationCoordinate,
        limit: ctx.input.limit,
        offset: ctx.input.offset,
        offsetToken: ctx.input.offsetToken,
        filters: ctx.input.filters,
        orderBy: ctx.input.orderBy
      });
      let result = client.extractFirstResult(response);
      let listings = (result?.items ?? []).map((item: any) => ({
        title: item.title,
        category: item.category,
        cid: item.cid,
        address: item.address,
        phone: item.phone,
        ratingValue: item.rating?.value,
        votesCount: item.rating?.votes_count
      }));

      return {
        output: {
          action: ctx.input.action,
          totalCount: result?.total_count,
          offsetToken: result?.offset_token,
          listings,
          cost: response.cost
        },
        message: `Found **${listings.length}** business listing(s).`
      };
    }

    if (!ctx.input.keyword) {
      throw dataForSEOServiceError('keyword is required when action is "google_reviews".');
    }

    let response = await client.businessDataGoogleReviewsTaskPost({
      keyword: ctx.input.keyword,
      locationName: ctx.input.locationName,
      locationCode: ctx.input.locationCode,
      locationCoordinate: ctx.input.locationCoordinate,
      languageName: ctx.input.languageName,
      languageCode: ctx.input.languageCode,
      depth: ctx.input.depth,
      sortBy: ctx.input.sortBy
    });
    let taskId = client.extractTaskId(response);
    let task = response.tasks?.[0];

    return {
      output: {
        action: ctx.input.action,
        taskId,
        statusMessage: task?.status_message ?? 'Task created',
        cost: response.cost
      },
      message: `Google Reviews task created for **"${ctx.input.keyword}"**. Task ID: \`${taskId}\`.`
    };
  })
  .build();
