import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listApplications = SlateTool.create(spec, {
  name: 'List Applications',
  key: 'list_applications',
  description: `List SSO application connectors configured in JumpCloud. Returns application names, SSO URLs, and configuration details for SAML 2.0 and OIDC-based single sign-on integrations.`,
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
        .describe('Maximum number of applications to return'),
      skip: z.number().min(0).optional().describe('Number to skip for pagination'),
      filter: z
        .string()
        .optional()
        .describe('Filter expression, e.g. "displayLabel:$eq:Slack"'),
      sort: z.string().optional().describe('Sort field')
    })
  )
  .output(
    z.object({
      applications: z
        .array(
          z.object({
            applicationId: z.string().describe('Application ID'),
            name: z.string().optional().describe('Application name'),
            displayName: z.string().optional().describe('Display name'),
            displayLabel: z.string().optional().describe('Display label'),
            ssoUrl: z.string().optional().describe('SSO URL'),
            active: z.boolean().optional().describe('Whether the application is active'),
            created: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of SSO applications'),
      totalCount: z.number().describe('Total number of applications')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    let result = await client.listApplications({
      limit: ctx.input.limit,
      skip: ctx.input.skip,
      filter: ctx.input.filter,
      sort: ctx.input.sort
    });

    let apps = result.results.map(a => ({
      applicationId: a._id,
      name: a.name,
      displayName: a.displayName,
      displayLabel: a.displayLabel,
      ssoUrl: a.ssoUrl,
      active: a.active,
      created: a.created
    }));

    return {
      output: {
        applications: apps,
        totalCount: result.totalCount
      },
      message: `Found **${result.totalCount}** applications. Returned **${apps.length}**.`
    };
  })
  .build();
