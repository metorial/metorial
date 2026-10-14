import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { backgroundSchema, mapBackground } from '../lib/schemas';
import { spec } from '../spec';
import { previewAttachment } from './get-file-url';

export let listBackgrounds = SlateTool.create(spec, {
  name: 'List Backgrounds',
  key: 'list_backgrounds',
  description: `List available background images and letterheads that can be applied to print jobs. Backgrounds are reusable across multiple print jobs for consistent branding.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .refine(Number.isSafeInteger, 'Use a whole-number limit')
        .min(1)
        .max(1000)
        .default(10)
        .describe('Number of results to return'),
      skip: z
        .number()
        .refine(Number.isSafeInteger, 'Use a whole-number offset')
        .min(0)
        .default(0)
        .describe('Number of results to skip for pagination'),
      sortField: z.enum(['created', 'name']).optional().describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).default('desc').describe('Sort order')
    })
  )
  .output(
    z.object({
      backgrounds: z.array(backgroundSchema).describe('List of backgrounds'),
      totalAvailable: z.number().describe('Total number of backgrounds'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, any> = {
      limit: ctx.input.limit,
      skip: ctx.input.skip,
      sort_order: ctx.input.sortOrder
    };
    if (ctx.input.sortField) params.sort_field = ctx.input.sortField;

    let result = await client.listBackgrounds(params);

    return {
      output: {
        backgrounds: result.data.map(mapBackground),
        totalAvailable: result.total_available,
        hasMore: result.has_more
      },
      message: `Found **${result.total_available}** background(s). Showing ${result.data.length} result(s).`
    };
  })
  .build();

export let getBackground = SlateTool.create(spec, {
  name: 'Get Background',
  key: 'get_background',
  description: `Retrieve details of a background or letterhead and its downloadable PDF preview.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      backgroundId: z.string().describe('The ID of the background to retrieve')
    })
  )
  .output(backgroundSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getBackground(ctx.input.backgroundId);
    let mapped = mapBackground(result);
    if (mapped.pdf) {
      await ctx.addAttachment(
        previewAttachment(mapped.pdf, {
          type: 'background',
          backgroundId: mapped.backgroundId
        })
      );
    }

    return {
      output: mapped,
      message: `Background **${mapped.backgroundId}** ("${mapped.name ?? 'unnamed'}") retrieved.`
    };
  })
  .build();

export let deleteBackground = SlateTool.create(spec, {
  name: 'Delete Background',
  key: 'delete_background',
  description: `Delete a background or letterhead. This cannot be undone. Intelliprint prevents deletion when a print job has used the background in the last 90 days.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      backgroundId: z.string().describe('The ID of the background to delete')
    })
  )
  .output(
    z.object({
      backgroundId: z.string().describe('The deleted background ID'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteBackground(ctx.input.backgroundId);

    return {
      output: {
        backgroundId: ctx.input.backgroundId,
        deleted: true
      },
      message: `Background **${ctx.input.backgroundId}** deleted.`
    };
  })
  .build();

export let createBackground = SlateTool.create(spec, {
  name: 'Create Background',
  key: 'create_background',
  description:
    'Upload reusable PDF, RTF, or Word artwork as a background or letterhead. Use the returned background ID in create_print_job or update_print_job.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      fileContentBase64: z
        .string()
        .min(1)
        .describe('Base64-encoded PDF, RTF, or Word document without a data URL prefix'),
      fileName: z.string().min(1).describe('Document filename including its extension'),
      name: z.string().optional().describe('Display name for this background')
    })
  )
  .output(backgroundSchema.omit({ pdf: true }))
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createBackground({
      file: { content: ctx.input.fileContentBase64, name: ctx.input.fileName },
      ...(ctx.input.name !== undefined ? { name: ctx.input.name } : {})
    });
    let { pdf, ...output } = mapBackground(result);
    if (pdf) {
      await ctx.addAttachment(
        previewAttachment(pdf, {
          type: 'background',
          backgroundId: output.backgroundId
        })
      );
    }
    return { output, message: `Created background **${output.backgroundId}**.` };
  })
  .build();

export let updateBackground = SlateTool.create(spec, {
  name: 'Update Background',
  key: 'update_background',
  description:
    'Rename a reusable background or letterhead. The artwork cannot be replaced; create a new background to upload a different file.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      backgroundId: z
        .string()
        .describe('Background ID returned by list_backgrounds or create_background'),
      name: z.string().min(1).describe('New display name for this background')
    })
  )
  .output(backgroundSchema.omit({ pdf: true }))
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateBackground(ctx.input.backgroundId, {
      name: ctx.input.name
    });
    let { pdf, ...output } = mapBackground(result);
    if (pdf) {
      await ctx.addAttachment(
        previewAttachment(pdf, {
          type: 'background',
          backgroundId: output.backgroundId
        })
      );
    }
    return { output, message: `Updated background **${output.backgroundId}**.` };
  })
  .build();
