import { SlateTool } from 'slates';
import { z } from 'zod';
import { TogglClient } from '../lib/client';
import { spec } from '../spec';

export let getWorkspace = SlateTool.create(spec, {
  name: 'Get Workspace',
  key: 'get_workspace',
  description: `Get details of a specific workspace, or list all workspaces the authenticated user belongs to. Workspaces contain projects, clients, tags, and time entries.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe('Specific workspace ID to retrieve. If omitted, lists all workspaces.')
    })
  )
  .output(
    z.object({
      workspaces: z
        .array(
          z.object({
            workspaceId: z.number().describe('Workspace ID'),
            name: z.string().describe('Workspace name'),
            organizationId: z.number().nullable().describe('Parent organization ID'),
            premium: z.boolean().describe('Whether the workspace has a paid plan'),
            admin: z.boolean().describe('Whether the current user is an admin'),
            defaultCurrency: z.string().nullable().describe('Default currency'),
            defaultHourlyRate: z.number().nullable().describe('Default hourly rate'),
            rounding: z.number().nullable().describe('Rounding mode'),
            roundingMinutes: z.number().nullable().describe('Rounding interval in minutes'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .describe('Workspace(s)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TogglClient(ctx.auth.token);

    let workspaces: any[];
    if (ctx.input.workspaceId) {
      let ws = await client.getWorkspace(ctx.input.workspaceId);
      workspaces = [ws];
    } else {
      workspaces = await client.listWorkspaces();
    }

    let mapped = (workspaces ?? []).map((w: any) => ({
      workspaceId: w.id,
      name: w.name,
      organizationId: w.organization_id ?? null,
      premium: w.premium ?? false,
      admin: w.admin ?? false,
      defaultCurrency: w.default_currency ?? null,
      defaultHourlyRate: w.default_hourly_rate ?? null,
      rounding: w.rounding ?? null,
      roundingMinutes: w.rounding_minutes ?? null,
      createdAt: w.created_at ?? w.at
    }));

    return {
      output: { workspaces: mapped },
      message: ctx.input.workspaceId
        ? `Workspace **${mapped[0]?.name}**`
        : `Found **${mapped.length}** workspaces`
    };
  })
  .build();
