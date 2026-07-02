import { SlateTool } from 'slates';
import { z } from 'zod';
import { FeatheryClient } from '../lib/client';
import { spec } from '../spec';

let workspaceBrandingSchema = z.object({
  name: z.string().optional().describe('Workspace name'),
  logo: z.string().optional().describe('URL of the workspace logo'),
  brandUrl: z.string().optional().describe('Custom brand URL'),
  brandFavicon: z.string().optional().describe('URL of the brand favicon'),
  brandName: z.string().optional().describe('Custom brand display name'),
  colors: z
    .record(z.string(), z.string())
    .optional()
    .describe('Custom color overrides (e.g., primary, secondary)')
});

let workspaceConfigSchema = z.object({
  features: z
    .record(z.string(), z.any())
    .optional()
    .describe('Feature limits (e.g., live_forms, submissions)'),
  disabledTabs: z.array(z.string()).optional().describe('UI tabs to hide in the workspace'),
  disabledSettings: z
    .array(z.string())
    .optional()
    .describe('Settings to hide in the workspace'),
  disabledElements: z
    .array(z.string())
    .optional()
    .describe('UI elements to hide in the workspace'),
  enabledIntegrations: z
    .array(z.string())
    .optional()
    .describe('Integrations to enable in the workspace'),
  metadata: z
    .record(z.string(), z.any())
    .optional()
    .describe('Arbitrary metadata for the workspace')
});

export let listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `List all white-label workspaces. Optionally include submission data for each workspace.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeSubmissionData: z
        .boolean()
        .optional()
        .describe('Whether to include submission data in the response')
    })
  )
  .output(
    z.object({
      workspaces: z
        .array(
          z.object({
            workspaceId: z.string().describe('Unique workspace identifier'),
            name: z.string().optional().describe('Workspace name'),
            brandName: z.string().optional().describe('Custom brand name'),
            logo: z.string().optional().describe('Logo URL'),
            test: z.boolean().optional().describe('Whether this is a test workspace'),
            createdAt: z.string().optional().describe('When the workspace was created')
          })
        )
        .describe('List of workspaces')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let workspaces = await client.listWorkspaces(ctx.input.includeSubmissionData);

    let mapped = workspaces.map((w: any) => ({
      workspaceId: w.id,
      name: w.name,
      brandName: w.brand_name,
      logo: w.logo,
      test: w.test,
      createdAt: w.created_at
    }));

    return {
      output: { workspaces: mapped },
      message: `Found **${mapped.length}** workspace(s).`
    };
  })
  .build();

export let createWorkspace = SlateTool.create(spec, {
  name: 'Create Workspace',
  key: 'create_workspace',
  description: `Create a new white-label workspace with custom branding, feature limits, and access controls. Workspaces provide isolated environments for different customers or teams.`
})
  .input(
    workspaceBrandingSchema.merge(workspaceConfigSchema).extend({
      name: z.string().describe('Name for the new workspace')
    })
  )
  .output(
    z.object({
      workspaceId: z.string().describe('ID of the created workspace'),
      name: z.string().describe('Name of the workspace')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let workspace = await client.createWorkspace({
      name: ctx.input.name,
      logo: ctx.input.logo,
      brandUrl: ctx.input.brandUrl,
      brandFavicon: ctx.input.brandFavicon,
      brandName: ctx.input.brandName,
      colors: ctx.input.colors as Record<string, string> | undefined,
      features: ctx.input.features,
      disabledTabs: ctx.input.disabledTabs,
      disabledSettings: ctx.input.disabledSettings,
      disabledElements: ctx.input.disabledElements,
      enabledIntegrations: ctx.input.enabledIntegrations,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        workspaceId: workspace.id,
        name: workspace.name || ctx.input.name
      },
      message: `Created workspace **${ctx.input.name}**.`
    };
  })
  .build();

export let updateWorkspace = SlateTool.create(spec, {
  name: 'Update Workspace',
  key: 'update_workspace',
  description: `Update an existing workspace's branding, features, access controls, or metadata.`
})
  .input(
    workspaceBrandingSchema.merge(workspaceConfigSchema).extend({
      workspaceId: z.string().describe('ID of the workspace to update')
    })
  )
  .output(
    z.object({
      workspaceId: z.string().describe('ID of the updated workspace'),
      name: z.string().optional().describe('Updated workspace name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let workspace = await client.updateWorkspace(ctx.input.workspaceId, {
      name: ctx.input.name,
      logo: ctx.input.logo,
      brandUrl: ctx.input.brandUrl,
      brandFavicon: ctx.input.brandFavicon,
      brandName: ctx.input.brandName,
      colors: ctx.input.colors as Record<string, string> | undefined,
      features: ctx.input.features,
      disabledTabs: ctx.input.disabledTabs,
      disabledSettings: ctx.input.disabledSettings,
      disabledElements: ctx.input.disabledElements,
      enabledIntegrations: ctx.input.enabledIntegrations,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        workspaceId: workspace.id || ctx.input.workspaceId,
        name: workspace.name
      },
      message: `Updated workspace **${ctx.input.workspaceId}**.`
    };
  })
  .build();

export let deleteWorkspace = SlateTool.create(spec, {
  name: 'Delete Workspace',
  key: 'delete_workspace',
  description: `Permanently delete a white-label workspace. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('ID of the workspace to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    await client.deleteWorkspace(ctx.input.workspaceId);

    return {
      output: { deleted: true },
      message: `Deleted workspace **${ctx.input.workspaceId}**.`
    };
  })
  .build();
