import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPanelButtons = SlateTool.create(spec, {
  name: 'List Panel Buttons',
  key: 'list_panel_buttons',
  description:
    'List configured TRIGGERcmd panel buttons, including their panel and button names. Use these names with trigger_panel_button to run the actions configured for a button.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      buttons: z.array(
        z.object({
          buttonId: z.string().describe('Unique button ID'),
          name: z.string().describe('Button name to pass to trigger_panel_button'),
          panelId: z.string().describe('Unique panel ID'),
          panelName: z.string().describe('Panel name to pass to trigger_panel_button'),
          params: z.string().optional().describe('Configured parameter choices, when present')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let buttons = await new Client(ctx.auth.token).listPanelButtons();
    return {
      output: { buttons },
      message: `Found **${buttons.length}** panel button(s).`
    };
  })
  .build();
