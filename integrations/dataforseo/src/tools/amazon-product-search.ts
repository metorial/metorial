import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { dataForSEOServiceError } from '../lib/errors';
import { spec } from '../spec';

export let amazonProductSearch = SlateTool.create(spec, {
  name: 'Amazon Product Search',
  key: 'amazon_product_search',
  description: `Create Amazon Merchant API tasks for product listing searches or ASIN detail lookups. Use product search for market and pricing research by keyword, and ASIN lookup when you already know the Amazon product identifier.`,
  instructions: [
    'Choose searchType "products" with keyword for Amazon product listing search tasks.',
    'Choose searchType "asin" with asin for Amazon ASIN lookup tasks.',
    'Use the returned taskId with Get Task Result and the matching Amazon endpoint enum.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      searchType: z
        .enum(['products', 'asin'])
        .default('products')
        .describe('Amazon Merchant task type to create'),
      keyword: z
        .string()
        .optional()
        .describe('Product keyword. Required when searchType is products.'),
      asin: z.string().optional().describe('Amazon ASIN. Required when searchType is asin.'),
      locationName: z.string().optional().describe('Amazon search location name'),
      locationCode: z.number().optional().describe('DataForSEO Amazon location code'),
      locationCoordinate: z
        .string()
        .optional()
        .describe('GPS coordinates in latitude,longitude,radius format'),
      languageName: z.string().optional().describe('Amazon language name'),
      languageCode: z.string().optional().describe('Amazon language code, e.g. en_US'),
      seDomain: z.string().optional().describe('Amazon search engine domain, e.g. amazon.com'),
      depth: z
        .number()
        .optional()
        .describe('Number of product results to request for products mode')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID for retrieving results'),
      searchType: z.string().describe('Created Amazon task type'),
      statusMessage: z.string().describe('Task status message'),
      cost: z.number().optional().describe('API cost')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.searchType === 'products') {
      if (!ctx.input.keyword) {
        throw dataForSEOServiceError('keyword is required when searchType is "products".');
      }

      let response = await client.merchantAmazonProductsTaskPost({
        keyword: ctx.input.keyword,
        locationName: ctx.input.locationName,
        locationCode: ctx.input.locationCode,
        locationCoordinate: ctx.input.locationCoordinate,
        languageName: ctx.input.languageName,
        languageCode: ctx.input.languageCode,
        seDomain: ctx.input.seDomain,
        depth: ctx.input.depth
      });
      let taskId = client.extractTaskId(response);
      let task = response.tasks?.[0];

      return {
        output: {
          taskId,
          searchType: ctx.input.searchType,
          statusMessage: task?.status_message ?? 'Task created',
          cost: response.cost
        },
        message: `Amazon product search task created for **"${ctx.input.keyword}"**. Task ID: \`${taskId}\`.`
      };
    }

    if (!ctx.input.asin) {
      throw dataForSEOServiceError('asin is required when searchType is "asin".');
    }

    let response = await client.merchantAmazonAsinTaskPost({
      asin: ctx.input.asin,
      locationName: ctx.input.locationName,
      locationCode: ctx.input.locationCode,
      locationCoordinate: ctx.input.locationCoordinate,
      languageName: ctx.input.languageName,
      languageCode: ctx.input.languageCode,
      seDomain: ctx.input.seDomain
    });
    let taskId = client.extractTaskId(response);
    let task = response.tasks?.[0];

    return {
      output: {
        taskId,
        searchType: ctx.input.searchType,
        statusMessage: task?.status_message ?? 'Task created',
        cost: response.cost
      },
      message: `Amazon ASIN task created for **${ctx.input.asin}**. Task ID: \`${taskId}\`.`
    };
  })
  .build();
