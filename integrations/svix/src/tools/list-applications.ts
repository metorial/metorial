import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listApplications = SlateTool.create(spec, {
  name: 'List Applications',
  key: 'list_applications',
  description: `List consumer applications in your Svix environment. Applications represent your customers, each receiving their own webhook messages. Use this to browse or search for applications before managing their endpoints or messages.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of applications to return (default 50)'),
      iterator: z.string().optional().describe('Pagination cursor from a previous request'),
      order: z
        .enum(['ascending', 'descending'])
        .optional()
        .describe('Sort order for returned applications'),
      excludeAppsWithNoEndpoints: z
        .boolean()
        .optional()
        .describe('Exclude applications that have no endpoints'),
      excludeAppsWithDisabledEndpoints: z
        .boolean()
        .optional()
        .describe('Exclude applications that only have disabled endpoints'),
      excludeAppsWithSvixPlayEndpoints: z
        .boolean()
        .optional()
        .describe('Exclude applications that only have Svix Play endpoints')
    })
  )
  .output(
    z.object({
      applications: z.array(
        z.object({
          applicationId: z.string().describe('Unique Svix application ID'),
          name: z.string().describe('Name of the application'),
          uid: z.string().optional().describe('Custom UID assigned to the application'),
          rateLimit: z.number().optional().describe('Rate limit for the application'),
          throttleRate: z.number().optional().describe('Message throttle rate'),
          metadata: z.record(z.string(), z.string()).describe('Application metadata'),
          createdAt: z.string().describe('When the application was created'),
          updatedAt: z.string().describe('When the application was last updated')
        })
      ),
      hasMore: z.boolean().describe('Whether there are more results'),
      iterator: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Fetching applications...');
    let result = await client.listApplications({
      limit: ctx.input.limit,
      iterator: ctx.input.iterator,
      order: ctx.input.order,
      excludeAppsWithNoEndpoints: ctx.input.excludeAppsWithNoEndpoints,
      excludeAppsWithDisabledEndpoints: ctx.input.excludeAppsWithDisabledEndpoints,
      excludeAppsWithSvixPlayEndpoints: ctx.input.excludeAppsWithSvixPlayEndpoints
    });

    let applications = result.data.map(app => ({
      applicationId: app.id,
      name: app.name,
      uid: app.uid ?? undefined,
      rateLimit: app.rateLimit ?? undefined,
      throttleRate: app.throttleRate ?? undefined,
      metadata: app.metadata || {},
      createdAt: app.createdAt,
      updatedAt: app.updatedAt
    }));

    return {
      output: {
        applications,
        hasMore: !result.done,
        iterator: result.iterator ?? undefined
      },
      message: `Found **${applications.length}** application(s).${applications.length > 0 ? `\n${applications.map(a => `- **${a.name}**${a.uid ? ` (uid: ${a.uid})` : ''}`).join('\n')}` : ''}`
    };
  })
  .build();
