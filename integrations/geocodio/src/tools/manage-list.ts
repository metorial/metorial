import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createGeocodingList = SlateTool.create(spec, {
  name: 'Create Geocoding List',
  key: 'create_geocoding_list',
  description: `Uploads CSV data for asynchronous batch geocoding. Processing happens in the background and results can be retrieved when complete. Supports both forward and reverse geocoding.

The **formatTemplate** defines how spreadsheet columns map to address components using Geocodio's template syntax (e.g. "{{A}} {{B}} {{C}}" maps columns A, B, C).

Optionally specify a **callbackUrl** to receive a webhook notification when processing completes.`,
  instructions: [
    'For forward geocoding, the formatTemplate maps columns to a full address, e.g. "{{A}}, {{B}}, {{C}} {{D}}" for street, city, state, zip.',
    'For reverse geocoding, the formatTemplate maps columns to coordinates, e.g. "{{A}},{{B}}" for lat, lng.'
  ],
  constraints: [
    'Supports up to 10M+ rows per list.',
    'Results are automatically deleted after 72 hours.',
    'Requires Lists API access enabled on the API key.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      csvContent: z.string().describe('CSV file content as a string'),
      filename: z.string().describe('Filename for the uploaded data, e.g. "addresses.csv"'),
      direction: z.enum(['forward', 'reverse']).describe('Geocoding direction'),
      formatTemplate: z
        .string()
        .describe('Column mapping template, e.g. "{{A}}, {{B}}, {{C}} {{D}}"'),
      fields: z
        .array(z.string())
        .optional()
        .describe('Data enrichment fields to append, e.g. ["timezone", "census"]'),
      callbackUrl: z
        .string()
        .optional()
        .describe('Webhook URL to receive notification when processing completes')
    })
  )
  .output(
    z.object({
      listId: z.number().describe('ID of the created geocoding list'),
      filename: z.string().describe('Uploaded filename'),
      status: z.string().describe('Current processing status'),
      rows: z.number().optional().describe('Number of rows detected')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.createList({
      fileContent: ctx.input.csvContent,
      filename: ctx.input.filename,
      direction: ctx.input.direction,
      format: ctx.input.formatTemplate,
      fields: ctx.input.fields,
      callback: ctx.input.callbackUrl
    });

    return {
      output: {
        listId: response.id,
        filename: response.file?.filename || ctx.input.filename,
        status: response.status || 'processing',
        rows: response.file?.estimated_rows_count
      },
      message: `Created geocoding list **#${response.id}** (${ctx.input.filename}) with **${response.file?.estimated_rows_count || 'unknown'}** rows. Status: **${response.status || 'processing'}**.`
    };
  })
  .build();

export let getListStatus = SlateTool.create(spec, {
  name: 'Get List Status',
  key: 'get_list_status',
  description: `Retrieves the current status and details of a geocoding list job. Shows processing progress, row counts, and download availability.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.number().describe('ID of the geocoding list to check')
    })
  )
  .output(
    z.object({
      listId: z.number().describe('List ID'),
      filename: z.string().optional().describe('Uploaded filename'),
      status: z.string().describe('Processing status'),
      rows: z.number().optional().describe('Total rows'),
      geocodedRows: z.number().optional().describe('Number of rows geocoded so far'),
      fields: z.array(z.string()).optional().describe('Enrichment fields requested'),
      progress: z.number().optional().describe('Processing progress percentage'),
      estimatedTimeRemaining: z.string().optional().describe('Estimated time to completion'),
      downloadUrl: z.string().optional().describe('URL to download completed results'),
      expiresAt: z.string().optional().describe('When results will be deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.getListStatus(ctx.input.listId);

    return {
      output: {
        listId: response.id,
        filename: response.file?.filename,
        status: response.status,
        rows: response.file?.estimated_rows_count,
        geocodedRows: response.file?.geocoded_rows_count,
        fields: response.fields,
        progress: response.progress,
        estimatedTimeRemaining: response.estimated_time_remaining,
        downloadUrl: response.download_url,
        expiresAt: response.expires_at
      },
      message: `List **#${response.id}** status: **${response.status}**${response.progress !== undefined ? ` (${response.progress}% complete)` : ''}. ${response.file?.geocoded_rows_count || 0}/${response.file?.estimated_rows_count || '?'} rows geocoded.`
    };
  })
  .build();

export let getLists = SlateTool.create(spec, {
  name: 'List Geocoding Jobs',
  key: 'list_geocoding_jobs',
  description: `Retrieves a paginated list of all geocoding list jobs. Shows recent jobs ordered by creation date.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (15 results per page)')
    })
  )
  .output(
    z.object({
      lists: z
        .array(
          z.object({
            listId: z.number().describe('List ID'),
            filename: z.string().optional().describe('Uploaded filename'),
            status: z.string().describe('Processing status'),
            rows: z.number().optional().describe('Total rows'),
            geocodedRows: z.number().optional().describe('Rows geocoded'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('Geocoding list jobs'),
      currentPage: z.number().optional().describe('Current page number'),
      totalPages: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.getLists(ctx.input.page);

    let lists = (response.data || response.lists || []).map((item: any) => ({
      listId: item.id,
      filename: item.file?.filename,
      status: item.status,
      rows: item.file?.estimated_rows_count,
      geocodedRows: item.file?.geocoded_rows_count,
      createdAt: item.created_at
    }));

    return {
      output: {
        lists,
        currentPage: response.current_page,
        totalPages: response.last_page
      },
      message: `Found **${lists.length}** geocoding list(s)${response.current_page ? ` (page ${response.current_page}/${response.last_page})` : ''}.`
    };
  })
  .build();

export let deleteGeocodingList = SlateTool.create(spec, {
  name: 'Delete Geocoding List',
  key: 'delete_geocoding_list',
  description: `Deletes a geocoding list job. If the job is still processing, it will be cancelled. If completed, the results will be removed.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      listId: z.number().describe('ID of the geocoding list to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteList(ctx.input.listId);

    return {
      output: { success: true },
      message: `Deleted geocoding list **#${ctx.input.listId}**.`
    };
  })
  .build();

export let downloadGeocodingList = SlateTool.create(spec, {
  name: 'Download Geocoding List',
  key: 'download_geocoding_list',
  description: `Downloads the results of a completed geocoding list job as CSV data. Only available when the list status is "completed".`,
  constraints: ['Results are only available for 72 hours after processing completes.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.number().describe('ID of the completed geocoding list to download')
    })
  )
  .output(
    z.object({
      csvContent: z.string().describe('CSV content of the geocoded results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.downloadList(ctx.input.listId);

    let csvContent = typeof response === 'string' ? response : JSON.stringify(response);

    return {
      output: { csvContent },
      message: `Downloaded results for geocoding list **#${ctx.input.listId}**.`
    };
  })
  .build();
