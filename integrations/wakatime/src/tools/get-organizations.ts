import { SlateTool } from 'slates';
import { z } from 'zod';
import { WakaTimeClient } from '../lib/client';
import { spec } from '../spec';

export let getOrganizations = SlateTool.create(spec, {
  name: 'Get Organizations',
  key: 'get_organizations',
  description: `List organizations the user belongs to, along with their dashboards and members. Optionally drill into a specific organization to see its dashboards, or into a specific dashboard to see members and summaries.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z.string().optional().describe('Organization ID to get dashboards for'),
      dashboardId: z
        .string()
        .optional()
        .describe('Dashboard ID to get members for (requires organizationId)'),
      summaryStartDate: z
        .string()
        .optional()
        .describe(
          'Start date (YYYY-MM-DD) for dashboard summaries (requires organizationId and dashboardId)'
        ),
      summaryEndDate: z
        .string()
        .optional()
        .describe(
          'End date (YYYY-MM-DD) for dashboard summaries (requires organizationId and dashboardId)'
        )
    })
  )
  .output(
    z.object({
      organizations: z
        .array(
          z
            .object({
              organizationId: z.string().describe('Organization ID'),
              name: z.string().describe('Organization name'),
              timeout: z.number().optional().describe('Keystroke timeout in seconds'),
              createdAt: z.string().optional().describe('When the organization was created')
            })
            .passthrough()
        )
        .optional()
        .describe('List of organizations (when no org ID is specified)'),
      dashboards: z
        .array(
          z
            .object({
              dashboardId: z.string().describe('Dashboard ID'),
              name: z.string().describe('Dashboard name'),
              createdAt: z.string().optional().describe('When the dashboard was created')
            })
            .passthrough()
        )
        .optional()
        .describe('Dashboards for the specified organization'),
      members: z
        .array(
          z
            .object({
              userId: z.string().optional().describe('Member user ID'),
              displayName: z.string().optional().describe('Member display name'),
              email: z.string().optional().describe('Member email'),
              photoUrl: z.string().optional().describe('Member photo URL')
            })
            .passthrough()
        )
        .optional()
        .describe('Members of the specified dashboard'),
      summaries: z.any().optional().describe('Coding activity summaries for the dashboard')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WakaTimeClient({ token: ctx.auth.token });

    // If we have summaryStartDate and summaryEndDate with org and dashboard, get summaries
    if (
      ctx.input.organizationId &&
      ctx.input.dashboardId &&
      ctx.input.summaryStartDate &&
      ctx.input.summaryEndDate
    ) {
      let summaries = await client.getOrganizationDashboardSummaries(
        ctx.input.organizationId,
        ctx.input.dashboardId,
        { start: ctx.input.summaryStartDate, end: ctx.input.summaryEndDate }
      );

      return {
        output: { summaries },
        message: `Retrieved dashboard summaries from **${ctx.input.summaryStartDate}** to **${ctx.input.summaryEndDate}**.`
      };
    }

    // If we have org and dashboard, get members
    if (ctx.input.organizationId && ctx.input.dashboardId) {
      let members = await client.getOrganizationDashboardMembers(
        ctx.input.organizationId,
        ctx.input.dashboardId
      );

      let mapped = (members || []).map((m: any) => ({
        userId: m.user?.id || m.id,
        displayName: m.user?.display_name || m.display_name,
        email: m.user?.email || m.email,
        photoUrl: m.user?.photo || m.photo
      }));

      return {
        output: { members: mapped },
        message: `Found **${mapped.length}** member(s) in dashboard.`
      };
    }

    // If we have org, get dashboards
    if (ctx.input.organizationId) {
      let dashboards = await client.getOrganizationDashboards(ctx.input.organizationId);

      let mapped = (dashboards || []).map((d: any) => ({
        dashboardId: d.id ?? '',
        name: d.name ?? '',
        createdAt: d.created_at
      }));

      return {
        output: { dashboards: mapped },
        message: `Found **${mapped.length}** dashboard(s) in organization.`
      };
    }

    // Default: list all organizations
    let orgs = await client.getOrganizations();

    let mapped = (orgs || []).map((o: any) => ({
      organizationId: o.id ?? '',
      name: o.name ?? '',
      timeout: o.timeout,
      createdAt: o.created_at
    }));

    return {
      output: { organizations: mapped },
      message: `Found **${mapped.length}** organization(s).`
    };
  })
  .build();
