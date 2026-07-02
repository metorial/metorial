import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let taskSchema = z.object({
  query: z.string().describe('Search query keyword or phrase'),
  domain: z.string().describe('Search engine domain, e.g. "google.com", "bing.com"'),
  lang: z.string().default('en').describe('Language code'),
  device: z.enum(['desktop', 'mobile', 'tablet']).default('desktop').describe('Device type'),
  serpType: z
    .enum(['web', 'news', 'image', 'shop'])
    .default('web')
    .describe('Type of search results'),
  loc: z.string().optional().describe('Location name'),
  locId: z.number().optional().describe('Location ID'),
  verbatim: z.boolean().optional().describe('Enable verbatim search'),
  filterSimilarResults: z.boolean().optional().describe('Filter similar/omitted results'),
  page: z.number().optional().describe('Page number'),
  numResults: z.number().optional().describe('Number of results per page'),
  dateRange: z.string().optional().describe('Date filter'),
  postbackUrl: z
    .string()
    .optional()
    .describe('Webhook URL to receive full results via POST when task completes'),
  pingbackUrl: z
    .string()
    .optional()
    .describe('Notification URL to receive a GET request when task completes')
});

export let scheduleSerp = SlateTool.create(spec, {
  name: 'Schedule Batch SERP Search',
  key: 'schedule_serp',
  description: `Submit one or more SERP search queries for asynchronous batch processing. Returns unique task IDs for each query that can be used to check status and retrieve results later. Supports up to 100 keywords in a single request. Optionally configure webhook URLs for automatic result delivery.`,
  instructions: [
    'Use "check_serp_task" to check if a scheduled task is complete, and "get_serp_result" to retrieve results.',
    'Configure postbackUrl for automatic result delivery via webhook POST, or pingbackUrl for completion notifications.'
  ],
  constraints: ['Maximum of 100 tasks per request.'],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      tasks: z.array(taskSchema).min(1).max(100).describe('Array of search tasks to schedule')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status'),
      message: z.string().describe('Response message'),
      scheduledTasks: z
        .array(z.any())
        .describe('Array of scheduled task objects with assigned IDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let apiTasks = ctx.input.tasks.map(task => ({
      q: task.query,
      domain: task.domain,
      lang: task.lang,
      device: task.device,
      serp_type: task.serpType,
      ...(task.loc ? { loc: task.loc } : {}),
      ...(task.locId ? { loc_id: task.locId } : {}),
      ...(task.verbatim !== undefined ? { verbatim: task.verbatim ? 1 : 0 } : {}),
      ...(task.filterSimilarResults !== undefined
        ? { gfilter: task.filterSimilarResults ? 1 : 0 }
        : {}),
      ...(task.page ? { page: task.page } : {}),
      ...(task.numResults ? { num_result: task.numResults } : {}),
      ...(task.dateRange ? { date_range: task.dateRange } : {}),
      ...(task.postbackUrl ? { postback_url: task.postbackUrl } : {}),
      ...(task.pingbackUrl ? { pingback_url: task.pingbackUrl } : {})
    }));

    let response = await client.scheduleSearch(apiTasks);

    let taskCount = response?.results?.length ?? 0;

    return {
      output: {
        status: response?.status ?? 'unknown',
        message: response?.msg ?? '',
        scheduledTasks: response?.results ?? []
      },
      message: `Scheduled **${taskCount}** SERP search task(s) for batch processing.`
    };
  })
  .build();
