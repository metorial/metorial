import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let workspaceUpdatedTrigger = SlateTrigger.create(spec, {
  name: 'Workspace Updated',
  key: 'workspace_updated',
  description:
    'Triggers when a Postman workspace changes. Detects new workspaces and modifications to existing ones by polling the workspaces list.'
})
  .input(
    z.object({
      workspaceId: z.string(),
      workspaceName: z.string(),
      type: z.string().optional(),
      visibility: z.string().optional()
    })
  )
  .output(
    z.object({
      workspaceId: z.string(),
      workspaceName: z.string(),
      type: z.string().optional(),
      visibility: z.string().optional()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let workspaces = await client.listWorkspaces();

      let knownWorkspaces: Record<string, string> = ctx.state?.knownWorkspaces ?? {};
      let inputs: Array<{
        workspaceId: string;
        workspaceName: string;
        type?: string;
        visibility?: string;
      }> = [];
      let updatedState: Record<string, string> = {};

      let isFirstRun = Object.keys(knownWorkspaces).length === 0;

      for (let w of workspaces) {
        let fingerprint = `${w.name}|${w.type}|${w.visibility}`;
        updatedState[w.id] = fingerprint;

        if (!isFirstRun) {
          let previousFingerprint = knownWorkspaces[w.id];
          if (!previousFingerprint || previousFingerprint !== fingerprint) {
            inputs.push({
              workspaceId: w.id,
              workspaceName: w.name,
              type: w.type,
              visibility: w.visibility
            });
          }
        }
      }

      return {
        inputs,
        updatedState: { knownWorkspaces: updatedState }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'workspace.updated',
        id: `${ctx.input.workspaceId}-${Date.now()}`,
        output: {
          workspaceId: ctx.input.workspaceId,
          workspaceName: ctx.input.workspaceName,
          type: ctx.input.type,
          visibility: ctx.input.visibility
        }
      };
    }
  })
  .build();
