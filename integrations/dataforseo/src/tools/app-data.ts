import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { dataForSEOServiceError } from '../lib/errors';
import { spec } from '../spec';

export let appData = SlateTool.create(spec, {
  name: 'App Data',
  key: 'app_data',
  description: `Create Google Play App Data API tasks for app searches, app information, and app reviews. Use this for app store research, ranking discovery, and review monitoring on Google Play.`,
  instructions: [
    'Use action "app_search" with keyword to find Google Play apps ranking for a query.',
    'Use action "app_info" or "app_reviews" with appId for a known Google Play app.',
    'Use the returned taskId with Get Task Result and the matching google_play_* endpoint enum.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['app_search', 'app_info', 'app_reviews'])
        .describe('Google Play App Data task to create'),
      keyword: z.string().optional().describe('Search keyword. Required for app_search.'),
      appId: z
        .string()
        .optional()
        .describe(
          'Google Play app ID, e.g. com.spotify.music. Required for app_info and app_reviews.'
        ),
      locationName: z.string().optional().describe('Google Play location name'),
      locationCode: z.number().optional().describe('DataForSEO Google Play location code'),
      languageName: z.string().optional().describe('Language name'),
      languageCode: z.string().optional().describe('Language code'),
      depth: z.number().optional().describe('Number of search results or reviews to request'),
      sortBy: z
        .string()
        .optional()
        .describe('Review sort mode for app_reviews, such as newest or most_relevant')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID for retrieving results'),
      action: z.string().describe('Created App Data task action'),
      statusMessage: z.string().describe('Task status message'),
      cost: z.number().optional().describe('API cost')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response: Awaited<ReturnType<Client['appDataGooglePlaySearchTaskPost']>>;

    if (ctx.input.action === 'app_search') {
      if (!ctx.input.keyword) {
        throw dataForSEOServiceError('keyword is required when action is "app_search".');
      }

      response = await client.appDataGooglePlaySearchTaskPost({
        keyword: ctx.input.keyword,
        locationName: ctx.input.locationName,
        locationCode: ctx.input.locationCode,
        languageName: ctx.input.languageName,
        languageCode: ctx.input.languageCode,
        depth: ctx.input.depth
      });
    } else if (ctx.input.action === 'app_info') {
      if (!ctx.input.appId) {
        throw dataForSEOServiceError('appId is required when action is "app_info".');
      }

      response = await client.appDataGooglePlayInfoTaskPost({
        appId: ctx.input.appId,
        locationName: ctx.input.locationName,
        locationCode: ctx.input.locationCode,
        languageName: ctx.input.languageName,
        languageCode: ctx.input.languageCode
      });
    } else {
      if (!ctx.input.appId) {
        throw dataForSEOServiceError('appId is required when action is "app_reviews".');
      }

      response = await client.appDataGooglePlayReviewsTaskPost({
        appId: ctx.input.appId,
        locationName: ctx.input.locationName,
        locationCode: ctx.input.locationCode,
        languageName: ctx.input.languageName,
        languageCode: ctx.input.languageCode,
        depth: ctx.input.depth,
        sortBy: ctx.input.sortBy
      });
    }

    let taskId = client.extractTaskId(response);
    let task = response.tasks?.[0];

    return {
      output: {
        taskId,
        action: ctx.input.action,
        statusMessage: task?.status_message ?? 'Task created',
        cost: response.cost
      },
      message: `Google Play ${ctx.input.action} task created. Task ID: \`${taskId}\`.`
    };
  })
  .build();
