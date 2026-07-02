import { SlateTool } from 'slates';
import { z } from 'zod';
import { ServerAvatarClient } from '../lib/client';
import { spec } from '../spec';

export let listApplications = SlateTool.create(spec, {
  name: 'List Applications',
  key: 'list_applications',
  description: `List applications across an organization or on a specific server. Returns application details including name, domain, framework, PHP version, SSL status, and size.
Optionally retrieve a single application's full details by providing both serverId and applicationId.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('Organization ID'),
      serverId: z
        .string()
        .optional()
        .describe(
          'Filter by specific server ID, or required when fetching a single application'
        ),
      applicationId: z
        .string()
        .optional()
        .describe('Specific application ID to retrieve full details (requires serverId)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      applications: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of applications'),
      application: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Single application details'),
      pagination: z.record(z.string(), z.unknown()).optional().describe('Pagination info')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ServerAvatarClient({ token: ctx.auth.token });
    let orgId = ctx.input.organizationId || ctx.config.organizationId;
    if (!orgId) throw new Error('organizationId is required either in input or config');

    if (ctx.input.applicationId) {
      if (!ctx.input.serverId)
        throw new Error('serverId is required when fetching a specific application');
      let application = await client.getApplication(
        orgId,
        ctx.input.serverId,
        ctx.input.applicationId
      );
      return {
        output: { application, applications: undefined, pagination: undefined },
        message: `Retrieved details for application **${(application as Record<string, unknown>).name || ctx.input.applicationId}**.`
      };
    }

    let result = await client.listApplications(orgId, {
      serverId: ctx.input.serverId,
      page: ctx.input.page
    });

    return {
      output: {
        applications: result.applications,
        application: undefined,
        pagination: result.pagination
      },
      message: `Found **${result.applications.length}** application(s)${ctx.input.serverId ? ` on server ${ctx.input.serverId}` : ''}.`
    };
  })
  .build();
