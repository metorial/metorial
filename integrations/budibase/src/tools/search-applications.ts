import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let applicationSchema = z.object({
  appId: z.string().describe('Unique identifier of the application'),
  name: z.string().describe('Name of the application'),
  url: z.string().describe('URL path for the application'),
  status: z.string().describe('Current status: "development" or "published"'),
  createdAt: z.string().optional().describe('ISO timestamp when the application was created'),
  updatedAt: z
    .string()
    .optional()
    .describe('ISO timestamp when the application was last updated'),
  version: z.string().optional().describe('Budibase client version'),
  tenantId: z.string().optional().describe('Tenant identifier')
});

export let searchApplications = SlateTool.create(spec, {
  name: 'Search Applications',
  key: 'search_applications',
  description: `Search for Budibase applications by name. Returns a list of applications matching the search criteria, including their IDs, URLs, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter applications by name')
    })
  )
  .output(
    z.object({
      applications: z.array(applicationSchema).describe('List of matching applications')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let results = await client.searchApplications({ name: ctx.input.name });

    let applications = results.map((app: any) => ({
      appId: app._id,
      name: app.name,
      url: app.url,
      status: app.status,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      version: app.version,
      tenantId: app.tenantId
    }));

    return {
      output: { applications },
      message: `Found **${applications.length}** application(s)${ctx.input.name ? ` matching "${ctx.input.name}"` : ''}.`
    };
  })
  .build();
