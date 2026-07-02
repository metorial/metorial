import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newMuralTrigger = SlateTrigger.create(spec, {
  name: 'New Mural',
  key: 'new_mural',
  description: 'Triggers when a new mural is created in a workspace.'
})
  .input(
    z.object({
      muralId: z.string(),
      title: z.string().optional(),
      workspaceId: z.string().optional(),
      roomId: z.string().optional(),
      createdOn: z.string().optional(),
      createdByName: z.string().optional()
    })
  )
  .output(
    z.object({
      muralId: z.string().describe('ID of the new mural'),
      title: z.string().optional().describe('Title of the mural'),
      workspaceId: z.string().optional().describe('Workspace the mural belongs to'),
      roomId: z.string().optional().describe('Room the mural is in'),
      createdOn: z.string().optional().describe('Mural creation timestamp'),
      createdByName: z.string().optional().describe('Name of the user who created the mural')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let workspaceId = ctx.config.workspaceId;
      if (!workspaceId) {
        let workspaces = await client.listWorkspaces(1);
        let firstWorkspace = workspaces.value[0];
        if (!firstWorkspace) {
          return { inputs: [], updatedState: ctx.state };
        }
        workspaceId = firstWorkspace.id;
      }

      let result = await client.listMuralsInWorkspace(workspaceId, { limit: 50 });
      let knownMuralIds: string[] = ctx.state?.knownMuralIds ? ctx.state.knownMuralIds : [];
      let isFirstRun = !ctx.state?.knownMuralIds;

      let newMurals = isFirstRun
        ? []
        : result.value.filter(m => !knownMuralIds.includes(m.id));

      let allIds = result.value.map(m => m.id);

      let inputs = newMurals.map(m => ({
        muralId: m.id,
        title: m.title,
        workspaceId: m.workspaceId,
        roomId: m.roomId,
        createdOn: m.createdOn,
        createdByName: m.createdBy
          ? `${m.createdBy.firstName || ''} ${m.createdBy.lastName || ''}`.trim()
          : undefined
      }));

      return {
        inputs,
        updatedState: {
          knownMuralIds: allIds,
          workspaceId
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'mural.created',
        id: ctx.input.muralId,
        output: {
          muralId: ctx.input.muralId,
          title: ctx.input.title,
          workspaceId: ctx.input.workspaceId,
          roomId: ctx.input.roomId,
          createdOn: ctx.input.createdOn,
          createdByName: ctx.input.createdByName
        }
      };
    }
  })
  .build();
