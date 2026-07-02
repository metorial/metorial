import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newWidgetTrigger = SlateTrigger.create(spec, {
  name: 'New Widget',
  key: 'new_widget',
  description:
    'Triggers when a new widget (sticky note, shape, text, image, etc.) is added to a mural.'
})
  .input(
    z.object({
      muralId: z.string(),
      widgetId: z.string(),
      widgetType: z.string(),
      text: z.string().optional(),
      x: z.number().optional(),
      y: z.number().optional()
    })
  )
  .output(
    z.object({
      muralId: z.string().describe('ID of the mural the widget was added to'),
      widgetId: z.string().describe('ID of the new widget'),
      widgetType: z
        .string()
        .describe('Type of widget (e.g., sticky_note, shape, text, image)'),
      text: z.string().optional().describe('Text content of the widget'),
      x: z.number().optional().describe('X position on the canvas'),
      y: z.number().optional().describe('Y position on the canvas')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let muralId = ctx.state?.muralId ? ctx.state.muralId : undefined;

      if (!muralId) {
        let workspaceId = ctx.config.workspaceId;
        if (!workspaceId) {
          let workspaces = await client.listWorkspaces(1);
          let firstWorkspace = workspaces.value[0];
          if (!firstWorkspace) {
            return { inputs: [], updatedState: ctx.state };
          }
          workspaceId = firstWorkspace.id;
        }
        let murals = await client.listMuralsInWorkspace(workspaceId, { limit: 1 });
        let firstMural = murals.value[0];
        if (!firstMural) {
          return { inputs: [], updatedState: ctx.state };
        }
        muralId = firstMural.id;
      }

      let result = await client.listWidgets(muralId, { limit: 100 });
      let knownWidgetIds: string[] = ctx.state?.knownWidgetIds ? ctx.state.knownWidgetIds : [];
      let isFirstRun = !ctx.state?.knownWidgetIds;

      let newWidgets = isFirstRun
        ? []
        : result.value.filter(w => !knownWidgetIds.includes(w.id));

      let allIds = result.value.map(w => w.id);

      let inputs = newWidgets.map(w => ({
        muralId,
        widgetId: w.id,
        widgetType: w.type,
        text: w.text || w.title,
        x: w.x,
        y: w.y
      }));

      return {
        inputs,
        updatedState: {
          muralId,
          knownWidgetIds: allIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `widget.created`,
        id: ctx.input.widgetId,
        output: {
          muralId: ctx.input.muralId,
          widgetId: ctx.input.widgetId,
          widgetType: ctx.input.widgetType,
          text: ctx.input.text,
          x: ctx.input.x,
          y: ctx.input.y
        }
      };
    }
  })
  .build();
