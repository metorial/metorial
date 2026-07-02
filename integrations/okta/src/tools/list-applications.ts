import { SlateTool } from 'slates';
import { z } from 'zod';
import { OktaClient } from '../lib/client';
import { spec } from '../spec';

let appSchema = z.object({
  appId: z.string().describe('Unique Okta application ID'),
  name: z.string().describe('Application technical name'),
  label: z.string().describe('Application display label'),
  status: z.string().describe('Application status (ACTIVE, INACTIVE)'),
  signOnMode: z
    .string()
    .describe('Sign-on mode (SAML_2_0, OPENID_CONNECT, BROWSER_PLUGIN, etc.)'),
  created: z.string(),
  lastUpdated: z.string()
});

export let listApplicationsTool = SlateTool.create(spec, {
  name: 'List Applications',
  key: 'list_applications',
  description: `Search and list applications registered in your Okta organization. Supports keyword search and filter expressions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search apps by label (starts-with matching)'),
      filter: z
        .string()
        .optional()
        .describe('Okta filter expression, e.g. status eq "ACTIVE"'),
      limit: z.number().optional().describe('Maximum number of apps to return'),
      after: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      applications: z.array(appSchema),
      nextCursor: z.string().optional(),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new OktaClient({
      domain: ctx.config.domain,
      token: ctx.auth.token
    });

    let result = await client.listApplications({
      query: ctx.input.query,
      filter: ctx.input.filter,
      limit: ctx.input.limit,
      after: ctx.input.after
    });

    let applications = result.items.map(app => ({
      appId: app.id,
      name: app.name,
      label: app.label,
      status: app.status,
      signOnMode: app.signOnMode,
      created: app.created,
      lastUpdated: app.lastUpdated
    }));

    let nextCursor: string | undefined;
    if (result.nextUrl) {
      let url = new URL(result.nextUrl);
      nextCursor = url.searchParams.get('after') || undefined;
    }

    return {
      output: {
        applications,
        nextCursor,
        hasMore: !!result.nextUrl
      },
      message: `Found **${applications.length}** application(s)${result.nextUrl ? ' (more available)' : ''}.`
    };
  })
  .build();
