import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listExtensions = SlateTool.create(spec, {
  name: 'List Extensions',
  key: 'list_extensions',
  description: `Lists and searches RingCentral account extensions (users, departments, IVR menus, etc.) with optional filtering by extension type and status. Returns paginated results.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      extensionType: z
        .enum([
          'User',
          'Department',
          'Announcement',
          'SharedLinesGroup',
          'PagingOnly',
          'IvrMenu',
          'ParkLocation'
        ])
        .optional()
        .describe('Filter by extension type'),
      status: z
        .enum(['Enabled', 'Disabled', 'NotActivated'])
        .optional()
        .describe('Filter by extension status'),
      perPage: z.number().optional().describe('Number of results per page'),
      page: z.number().optional().describe('Page number to retrieve')
    })
  )
  .output(
    z.object({
      extensions: z
        .array(
          z.object({
            extensionId: z.string(),
            extensionNumber: z.string(),
            name: z.string(),
            type: z.string(),
            status: z.string(),
            email: z.string().optional()
          })
        )
        .describe('List of extensions'),
      totalCount: z.number(),
      page: z.number(),
      perPage: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result = await client.listExtensions({
      type: ctx.input.extensionType,
      status: ctx.input.status,
      perPage: ctx.input.perPage,
      page: ctx.input.page
    });

    let extensions = (result.records || []).map((ext: any) => ({
      extensionId: String(ext.id),
      extensionNumber: ext.extensionNumber || '',
      name:
        ext.name || ext.contact?.firstName
          ? `${ext.contact?.firstName || ''} ${ext.contact?.lastName || ''}`.trim()
          : '',
      type: ext.type || '',
      status: ext.status || '',
      email: ext.contact?.email
    }));

    let totalCount = result.paging?.totalElements ?? extensions.length;
    let page = result.paging?.page ?? 1;
    let perPage = result.paging?.perPage ?? extensions.length;

    return {
      output: {
        extensions,
        totalCount,
        page,
        perPage
      },
      message: `Found **${totalCount}** extensions (showing page ${page}, ${extensions.length} results).`
    };
  })
  .build();
