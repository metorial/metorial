import { isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient } from '../lib/client';
import { workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

let getWorkspacePlan = (workspace: {
  featureSubscriptionType?: unknown;
  plan?: unknown;
}): string | undefined => {
  let subscription = workspace.featureSubscriptionType;
  if (typeof subscription === 'string' && subscription) {
    return subscription;
  }
  if (
    isApiErrorRecord(subscription) &&
    typeof subscription.addonSubscriptionPlan === 'string' &&
    subscription.addonSubscriptionPlan
  ) {
    return subscription.addonSubscriptionPlan;
  }
  return typeof workspace.plan === 'string' && workspace.plan ? workspace.plan : undefined;
};

export let getWorkspace = SlateTool.create(spec, {
  name: 'Get Workspace',
  key: 'get_workspace',
  description: `Get details about the selected Clockify workspace, including settings, features, and billing info. Call get_workspaces to discover the workspace ID.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema
    })
  )
  .output(
    z.object({
      workspaceId: z.string(),
      name: z.string(),
      imageUrl: z.string().optional(),
      plan: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createApiClient(ctx);

    let workspace = await client.getWorkspace();
    let plan = getWorkspacePlan(workspace);

    return {
      output: {
        workspaceId: workspace.id,
        name: workspace.name,
        imageUrl: workspace.imageUrl || undefined,
        plan
      },
      message: `Workspace: **${workspace.name}** (plan: ${plan || 'unknown'}).`
    };
  })
  .build();

export let getWorkspaces = SlateTool.create(spec, {
  name: 'Get Workspaces',
  key: 'get_workspaces',
  description:
    'List workspaces accessible to the authenticated Clockify user. Use a returned workspaceId in workspace tools.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      workspaces: z.array(
        z.object({
          workspaceId: z.string(),
          name: z.string(),
          imageUrl: z.string().optional(),
          plan: z.string().optional()
        })
      ),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let workspaces = await createApiClient(ctx).getWorkspaces();
    let mapped = workspaces.map(
      (workspace: {
        id: string;
        name: string;
        imageUrl?: string | null;
        featureSubscriptionType?: unknown;
        plan?: unknown;
      }) => ({
        workspaceId: workspace.id,
        name: workspace.name,
        imageUrl: workspace.imageUrl || undefined,
        plan: getWorkspacePlan(workspace)
      })
    );
    return {
      output: { workspaces: mapped, count: mapped.length },
      message: `Retrieved **${mapped.length}** workspaces.`
    };
  })
  .build();
