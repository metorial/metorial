import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageApplication = SlateTool.create(spec, {
  name: 'Manage Team Application',
  key: 'manage_application',
  description: `List, view, approve, or deny membership applications for teams that use application-based membership policies. Provide applicationId to view/update a specific application, or omit it to list all applications.`,
  instructions: [
    'To list applications, provide teamSlug and optional filters.',
    'To approve or deny, provide teamSlug, applicationId, and status ("Approved" or "Denied").'
  ]
})
  .input(
    z.object({
      teamSlug: z.string().describe('Team slug'),
      applicationId: z.number().optional().describe('Application ID to view or update'),
      status: z
        .enum(['Approved', 'Denied'])
        .optional()
        .describe('New status for the application'),
      filterStatus: z
        .string()
        .optional()
        .describe('Filter by status when listing (Pending, Approved, Denied)'),
      filterUser: z.string().optional().describe('Filter by user when listing'),
      limit: z.number().optional().describe('Number of results per page'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      totalCount: z.number().optional().describe('Total count (when listing)'),
      applications: z.array(
        z.object({
          applicationId: z.number().describe('Application ID'),
          username: z.string().describe('Applicant username'),
          note: z.string().describe('Application note'),
          status: z.string().describe('Application status'),
          created: z.string().describe('Created date'),
          modified: z.string().describe('Modified date')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    if (ctx.input.applicationId && ctx.input.status) {
      let app = await client.updateApplication(
        ctx.input.teamSlug,
        ctx.input.applicationId,
        ctx.input.status
      );
      return {
        output: {
          applications: [
            {
              applicationId: app.id,
              username: app.user.username,
              note: app.note,
              status: app.status,
              created: app.created,
              modified: app.modified
            }
          ]
        },
        message: `**${ctx.input.status}** application #${app.id} from **${app.user.username}** for team \`${ctx.input.teamSlug}\`.`
      };
    }

    if (ctx.input.applicationId) {
      let app = await client.getApplication(ctx.input.teamSlug, ctx.input.applicationId);
      return {
        output: {
          applications: [
            {
              applicationId: app.id,
              username: app.user.username,
              note: app.note,
              status: app.status,
              created: app.created,
              modified: app.modified
            }
          ]
        },
        message: `Application #${app.id} from **${app.user.username}**: status **${app.status}**.`
      };
    }

    let result = await client.listApplications(ctx.input.teamSlug, {
      status: ctx.input.filterStatus,
      user: ctx.input.filterUser,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let applications = result.objects.map(a => ({
      applicationId: a.id,
      username: a.user.username,
      note: a.note,
      status: a.status,
      created: a.created,
      modified: a.modified
    }));

    return {
      output: {
        totalCount: result.meta.total_count,
        applications
      },
      message: `Found **${result.meta.total_count}** application(s) for team \`${ctx.input.teamSlug}\`.`
    };
  })
  .build();
