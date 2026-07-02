import { SlateTool } from 'slates';
import { z } from 'zod';
import { BusinessClient } from '../lib/client';
import { spec } from '../spec';

export let listTrainingData = SlateTool.create(spec, {
  name: 'List Training Data',
  key: 'list_training_data',
  description: `Retrieve all training data files and entries associated with a bot. Use this to view the bot's knowledge base, check processing status of uploads, and find data entries for deletion.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchQuery: z
        .string()
        .optional()
        .describe('Search for training data matching this query'),
      sortBy: z
        .string()
        .optional()
        .describe('Field to sort by (e.g. updated_at, created_at, status)'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      size: z.number().optional().describe('Number of results per page (1-100, default 50)')
    })
  )
  .output(
    z.object({
      trainingData: z
        .array(
          z.object({
            dataId: z.string().describe('Unique data entry identifier'),
            botId: z.string().describe('Bot this data belongs to'),
            url: z.string().describe('URL or file path of the data'),
            title: z.string().describe('Title of the data entry'),
            fileType: z.string().describe('Type of file (web_url, docx, pdf, etc.)'),
            status: z
              .string()
              .describe(
                'Processing status (accepted, processing, processed, rejected, timed_out, etc.)'
              ),
            characters: z.number().describe('Number of characters in the data'),
            errorReason: z.string().describe('Error reason if processing failed'),
            lastTrainedAt: z.string().describe('When the data was last trained'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('List of training data entries'),
      total: z.number().describe('Total number of entries'),
      page: z.number().describe('Current page number'),
      pages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BusinessClient(ctx.auth.token);

    let result = await client.listBotData({
      searchQuery: ctx.input.searchQuery,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder,
      page: ctx.input.page,
      size: ctx.input.size
    });

    let trainingData = result.items.map(d => ({
      dataId: d.id,
      botId: d.bot_id,
      url: d.url || '',
      title: d.title || '',
      fileType: d.file_type || '',
      status: d.status || '',
      characters: d.characters || 0,
      errorReason: d.error_reason || '',
      lastTrainedAt: d.last_trained_at || '',
      createdAt: d.created_at,
      updatedAt: d.updated_at
    }));

    return {
      output: {
        trainingData,
        total: result.total,
        page: result.page,
        pages: result.pages
      },
      message: `Found **${result.total}** training data entries (page ${result.page}/${result.pages}).`
    };
  })
  .build();
