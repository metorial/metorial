import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { GtmClient } from '../lib/client';
import { googleTagManagerActionScopes } from '../scopes';
import { spec } from '../spec';

export let workspaceChanged = SlateTrigger.create(spec, {
  name: 'Workspace Changed',
  key: 'workspace_changed',
  description:
    'Triggers when changes are detected in a GTM workspace, such as modified tags, triggers, or variables. Polls workspace status to detect pending changes.'
})
  .scopes(googleTagManagerActionScopes.workspaceChanged)
  .input(
    z.object({
      accountId: z.string().describe('GTM account ID'),
      containerId: z.string().describe('GTM container ID'),
      workspaceId: z.string().describe('Workspace ID'),
      workspaceName: z.string().optional().describe('Workspace name'),
      changeCount: z.number().describe('Number of changes detected'),
      hasMergeConflicts: z.boolean().describe('Whether merge conflicts exist'),
      detectedAt: z.string().describe('ISO timestamp when the change was detected')
    })
  )
  .output(
    z.object({
      accountId: z.string().describe('GTM account ID'),
      containerId: z.string().describe('GTM container ID'),
      workspaceId: z.string().describe('Workspace ID'),
      workspaceName: z.string().optional().describe('Workspace name'),
      changeCount: z.number().describe('Number of pending changes'),
      hasMergeConflicts: z.boolean().describe('Whether merge conflicts exist')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new GtmClient(ctx.auth.token);

      let lastChangeCounts = (ctx.state?.lastChangeCounts || {}) as Record<string, number>;
      let monitoredWorkspaces = (ctx.state?.monitoredWorkspaces || []) as Array<{
        accountId: string;
        containerId: string;
        workspaceId: string;
        workspaceName?: string;
      }>;

      // On first run, discover workspaces to monitor
      if (monitoredWorkspaces.length === 0) {
        let accountsResponse = await client.listAccounts();
        let accounts = accountsResponse.account || [];

        for (let account of accounts) {
          if (!account.accountId) continue;
          let containersResponse = await client.listContainers(account.accountId);
          let containers = containersResponse.container || [];

          for (let container of containers) {
            if (!container.containerId) continue;
            try {
              let workspacesResponse = await client.listWorkspaces(
                account.accountId,
                container.containerId
              );
              let workspaces = workspacesResponse.workspace || [];

              for (let workspace of workspaces) {
                if (!workspace.workspaceId) continue;
                monitoredWorkspaces.push({
                  accountId: account.accountId,
                  containerId: container.containerId,
                  workspaceId: workspace.workspaceId,
                  workspaceName: workspace.name
                });

                // Initialize baseline change counts
                let key = `${account.accountId}/${container.containerId}/${workspace.workspaceId}`;
                try {
                  let status = await client.getWorkspaceStatus(
                    account.accountId,
                    container.containerId,
                    workspace.workspaceId
                  );
                  lastChangeCounts[key] = status.workspaceChange?.length || 0;
                } catch {
                  lastChangeCounts[key] = 0;
                }
              }
            } catch {
              // Skip containers with permission issues
            }
          }
        }

        return {
          inputs: [],
          updatedState: {
            lastChangeCounts,
            monitoredWorkspaces
          }
        };
      }

      // Check each monitored workspace for changes
      let inputs: Array<{
        accountId: string;
        containerId: string;
        workspaceId: string;
        workspaceName?: string;
        changeCount: number;
        hasMergeConflicts: boolean;
        detectedAt: string;
      }> = [];

      for (let ws of monitoredWorkspaces) {
        let key = `${ws.accountId}/${ws.containerId}/${ws.workspaceId}`;
        try {
          let status = await client.getWorkspaceStatus(
            ws.accountId,
            ws.containerId,
            ws.workspaceId
          );
          let currentChangeCount = status.workspaceChange?.length || 0;
          let hasMergeConflicts = (status.mergeConflict || []).length > 0;

          if (currentChangeCount !== lastChangeCounts[key]) {
            inputs.push({
              accountId: ws.accountId,
              containerId: ws.containerId,
              workspaceId: ws.workspaceId,
              workspaceName: ws.workspaceName,
              changeCount: currentChangeCount,
              hasMergeConflicts,
              detectedAt: new Date().toISOString()
            });
            lastChangeCounts[key] = currentChangeCount;
          }
        } catch {
          // Skip workspaces with permission issues
        }
      }

      return {
        inputs,
        updatedState: {
          lastChangeCounts,
          monitoredWorkspaces
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'workspace.changed',
        id: `${ctx.input.accountId}_${ctx.input.containerId}_${ctx.input.workspaceId}_${ctx.input.detectedAt}`,
        output: {
          accountId: ctx.input.accountId,
          containerId: ctx.input.containerId,
          workspaceId: ctx.input.workspaceId,
          workspaceName: ctx.input.workspaceName,
          changeCount: ctx.input.changeCount,
          hasMergeConflicts: ctx.input.hasMergeConflicts
        }
      };
    }
  })
  .build();
