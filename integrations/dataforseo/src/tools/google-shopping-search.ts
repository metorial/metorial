import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let _shoppingItemSchema = z
  .object({
    type: z.string().optional().describe('Type of result'),
    rankGroup: z.number().optional().describe('Position in the results group'),
    rankAbsolute: z.number().optional().describe('Absolute position'),
    title: z.string().optional().describe('Product title'),
    price: z.number().optional().describe('Product price'),
    currency: z.string().optional().describe('Price currency'),
    seller: z.string().optional().describe('Seller name'),
    url: z.string().optional().describe('Product URL'),
    productRating: z.number().optional().describe('Product rating'),
    productReviewsCount: z.number().optional().describe('Number of product reviews'),
    productId: z.string().optional().describe('Product identifier')
  })
  .passthrough();

export let googleShoppingSearch = SlateTool.create(spec, {
  name: 'Google Shopping Search',
  key: 'google_shopping_search',
  description: `Search Google Shopping for product listings by keyword. Returns product prices, sellers, ratings, and reviews. Creates an asynchronous task and returns a task ID for result retrieval. Useful for price monitoring, competitive pricing analysis, and ecommerce market research.`,
  instructions: [
    'Provide a product keyword to search in Google Shopping.',
    'This creates an asynchronous task. Use the returned task ID with the "Get Task Result" tool to retrieve results.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      keyword: z.string().describe('Product keyword to search (e.g., "wireless headphones")'),
      locationName: z.string().optional().describe('Target location (e.g., "United States")'),
      locationCode: z.number().optional().describe('DataForSEO location code'),
      languageName: z.string().optional().describe('Language name (e.g., "English")'),
      languageCode: z.string().optional().describe('Language code (e.g., "en")'),
      device: z.enum(['desktop', 'mobile']).optional().describe('Device type for the search'),
      os: z.enum(['windows', 'macos']).optional().describe('Desktop operating system'),
      limit: z.number().optional().describe('Maximum number of product results requested'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID for retrieving results'),
      keyword: z.string().describe('Searched keyword'),
      statusMessage: z.string().describe('Task status message'),
      cost: z.number().optional().describe('API cost')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.merchantGoogleProductsLive({
      keyword: ctx.input.keyword,
      locationName: ctx.input.locationName,
      locationCode: ctx.input.locationCode,
      languageName: ctx.input.languageName,
      languageCode: ctx.input.languageCode,
      device: ctx.input.device,
      os: ctx.input.os,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let taskId = client.extractTaskId(response);
    let task = response.tasks?.[0];

    return {
      output: {
        taskId,
        keyword: ctx.input.keyword,
        statusMessage: task?.status_message ?? 'Task created',
        cost: response.cost
      },
      message: `Google Shopping search task created for **"${ctx.input.keyword}"**. Task ID: \`${taskId}\`.`
    };
  })
  .build();
