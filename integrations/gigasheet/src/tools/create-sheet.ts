import { SlateTool } from 'slates';
import { z } from 'zod';
import { GigasheetClient } from '../lib/client';
import { spec } from '../spec';

export let createSheet = SlateTool.create(spec, {
  name: 'Create Sheet',
  key: 'create_sheet',
  description: `Create a new sheet in Gigasheet. You can create a blank sheet with optional column headers, upload data from a URL, or upload raw data directly. Also supports creating folders for organization.`,
  instructions: [
    'When using uploadUrl, provide a publicly accessible URL (including pre-signed S3 URLs) to a CSV, JSON, or other supported file format.',
    'When using rawData, provide the data as a string in CSV or JSON format.'
  ]
})
  .input(
    z.object({
      method: z
        .enum(['blank', 'from_url', 'raw_data', 'folder'])
        .describe('How to create the sheet'),
      name: z.string().optional().describe('Name for the new sheet or folder'),
      parentHandle: z
        .string()
        .optional()
        .describe('Handle of the parent folder to create the sheet in'),
      columns: z.array(z.string()).optional().describe('Column headers for a blank sheet'),
      uploadUrl: z
        .string()
        .optional()
        .describe('URL to import data from (for from_url method)'),
      rawData: z
        .string()
        .optional()
        .describe('Raw data content to upload (for raw_data method)'),
      format: z.string().optional().describe('Format of the raw data (e.g., csv, json)')
    })
  )
  .output(
    z.object({
      result: z
        .record(z.string(), z.unknown())
        .describe('Creation result including the handle of the new sheet or folder')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GigasheetClient({ token: ctx.auth.token });
    let result: Record<string, unknown>;

    switch (ctx.input.method) {
      case 'blank':
        result = await client.createBlankFile({
          name: ctx.input.name ?? 'Untitled Sheet',
          parentHandle: ctx.input.parentHandle,
          columns: ctx.input.columns
        });
        break;

      case 'from_url':
        if (!ctx.input.uploadUrl) {
          throw new Error('uploadUrl is required when method is "from_url"');
        }
        result = await client.uploadFromUrl({
          url: ctx.input.uploadUrl,
          name: ctx.input.name,
          parentHandle: ctx.input.parentHandle
        });
        break;

      case 'raw_data':
        if (!ctx.input.rawData) {
          throw new Error('rawData is required when method is "raw_data"');
        }
        result = await client.uploadDirect({
          data: ctx.input.rawData,
          name: ctx.input.name,
          parentHandle: ctx.input.parentHandle,
          format: ctx.input.format
        });
        break;

      case 'folder':
        result = await client.createFolder({
          name: ctx.input.name ?? 'New Folder',
          parentHandle: ctx.input.parentHandle
        });
        break;
    }

    return {
      output: { result },
      message: `Created ${ctx.input.method === 'folder' ? 'folder' : 'sheet'} **${ctx.input.name ?? 'Untitled'}** successfully.`
    };
  })
  .build();
