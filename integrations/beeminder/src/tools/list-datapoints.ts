import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BeeminderClient, validateWholeNumber } from '../lib/client';
import { datapointSchema, mapDatapoint, responseArray, responseRecord } from '../lib/schemas';
import { spec } from '../spec';

export let listDatapoints = SlateTool.create(spec, {
  name: 'List Datapoints',
  key: 'list_datapoints',
  description:
    'Retrieve goal datapoints with pagination and sorting. Includes values, dates, comments, identifiers, and provider metadata.',
  instructions: [
    'sortBy names the provider attribute to sort by, descending by default. The provider defaults to id when neither sort nor sortBy is supplied.',
    'sort asc fetches all datapoints and sorts locally before pagination; use descending order for large goals when possible.',
    'count is ignored when page is supplied. per is ignored without page.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      goalSlug: z.string().describe('URL-friendly identifier of the goal'),
      sort: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Sort direction, using timestamp unless sortBy is supplied'),
      count: z.number().optional().describe('Limit on the number of datapoints returned'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      per: z.number().optional().describe('Number of results per page'),
      sortBy: z
        .string()
        .optional()
        .describe('Datapoint attribute to sort by, such as id, timestamp, or updated_at')
    })
  )
  .output(
    z.object({
      datapoints: z.array(datapointSchema).describe('List of datapoints for the goal')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BeeminderClient(ctx.auth);
    let { goalSlug, sort, sortBy, ...params } = ctx.input;
    validateWholeNumber(params.count, 'count');
    validateWholeNumber(params.page, 'page', 1);
    validateWholeNumber(params.per, 'per');
    if (sortBy !== undefined && !/^[a-z_]+$/.test(sortBy)) {
      throw createApiServiceError(
        'sortBy must name a datapoint attribute, such as timestamp or updated_at.'
      );
    }
    let attribute = sortBy ?? (sort ? 'timestamp' : undefined);
    let raw = responseArray(
      await client.getDatapoints(goalSlug, {
        sort: attribute,
        ...(sort === 'asc' ? {} : params)
      })
    );
    if (sort === 'asc') {
      let field = attribute ?? 'timestamp';
      let values = raw.map(item => {
        let record = responseRecord(item);
        let value = record[field];
        if (typeof value !== 'number' && typeof value !== 'string') {
          throw createApiServiceError(
            `Beeminder did not return a sortable ${field} on every datapoint.`,
            { reason: 'beeminder_invalid_response' }
          );
        }
        return { record, value };
      });
      values.sort((left, right) =>
        left.value < right.value ? -1 : left.value > right.value ? 1 : 0
      );
      raw = values.map(item => item.record);
      if (params.page !== undefined) {
        let per = params.per ?? 25;
        raw = raw.slice((params.page - 1) * per, params.page * per);
      } else if (params.count !== undefined) raw = raw.slice(0, params.count);
    }
    let datapoints = raw.map(mapDatapoint);
    return {
      output: { datapoints },
      message: `Retrieved **${datapoints.length}** datapoint(s) for goal **${goalSlug}**.`
    };
  })
  .build();
