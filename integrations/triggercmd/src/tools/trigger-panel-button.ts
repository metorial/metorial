import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let triggerPanelButton = SlateTool.create(spec, {
  name: 'Trigger Panel Button',
  key: 'trigger_panel_button',
  description:
    'Request the configured actions for a TRIGGERcmd panel button. Discover the panel and button names with list_panel_buttons first. A successful request does not confirm completion of the underlying computer commands.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      panel: z.string().describe('Panel name from list_panel_buttons'),
      button: z.string().describe('Button name from list_panel_buttons'),
      params: z.string().optional().describe('Optional parameters for the button actions')
    })
  )
  .output(z.object({ result: z.any().describe('Complete TRIGGERcmd response') }))
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth.token).triggerPanelButton(ctx.input);
    return {
      output: { result },
      message: `Requested button **${ctx.input.button}** on panel **${ctx.input.panel}**.`
    };
  })
  .build();
