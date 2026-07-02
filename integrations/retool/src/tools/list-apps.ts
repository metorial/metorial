import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listApps = SlateTool.create(spec, {
  name: 'List Apps',
  key: 'list_apps',
  description: `List all Retool applications in the organization. Supports pagination for organizations with many apps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of apps to return (1-100)'),
      nextToken: z.string().optional().describe('Pagination token from a previous response')
    })
  )
  .output(
    z.object({
      apps: z.array(
        z.object({
          appId: z.string(),
          appName: z.string(),
          folderId: z.string().nullable().optional(),
          isMobileApp: z.boolean().optional(),
          isMultipageApp: z.boolean().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      ),
      totalCount: z.number(),
      hasMore: z.boolean(),
      nextToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result = await client.listApps({
      limit: ctx.input.limit,
      nextToken: ctx.input.nextToken
    });

    let apps = result.data.map(a => ({
      appId: a.id,
      appName: a.name,
      folderId: a.folder_id,
      isMobileApp: a.is_mobile_app,
      isMultipageApp: a.is_multipage_app,
      createdAt: a.created_at,
      updatedAt: a.updated_at
    }));

    return {
      output: {
        apps,
        totalCount: result.total_count,
        hasMore: result.has_more,
        nextToken: result.next_token
      },
      message: `Found **${result.total_count}** apps. Returned **${apps.length}** apps${result.has_more ? ' (more available)' : ''}.`
    };
  })
  .build();
