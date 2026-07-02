import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFilesTool = SlateTool.create(spec, {
  name: 'List Files',
  key: 'list_files',
  description:
    'Retrieve digital product files from Lemon Squeezy. Returns file metadata and signed download URLs for customer-delivered files; download URLs expire and are rate-limited by Lemon Squeezy.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      variantId: z.string().optional().describe('Filter files by variant ID'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      files: z.array(
        z.object({
          fileId: z.string(),
          variantId: z.number(),
          identifier: z.string(),
          name: z.string(),
          extension: z.string(),
          downloadUrl: z.string(),
          size: z.number(),
          sizeFormatted: z.string(),
          version: z.string().nullable(),
          sort: z.number(),
          status: z.string(),
          createdAt: z.string(),
          updatedAt: z.string(),
          testMode: z.boolean()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listFiles({
      variantId: ctx.input.variantId,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let files = (response.data || []).map((file: any) => ({
      fileId: file.id,
      variantId: file.attributes.variant_id,
      identifier: file.attributes.identifier,
      name: file.attributes.name,
      extension: file.attributes.extension,
      downloadUrl: file.attributes.download_url,
      size: file.attributes.size,
      sizeFormatted: file.attributes.size_formatted,
      version: file.attributes.version,
      sort: file.attributes.sort,
      status: file.attributes.status,
      createdAt: file.attributes.created_at,
      updatedAt: file.attributes.updated_at,
      testMode: file.attributes.test_mode
    }));

    let hasMore =
      !!response.meta?.page?.lastPage &&
      response.meta?.page?.currentPage < response.meta?.page?.lastPage;

    return {
      output: { files, hasMore },
      message: `Found **${files.length}** file(s).`
    };
  })
  .build();
