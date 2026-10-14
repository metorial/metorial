import { SlateTool } from 'slates';
import { z } from 'zod';
import { Msg91Client } from '../lib/client';
import { spec } from '../spec';

export let listWhatsAppNumbers = SlateTool.create(spec, {
  name: 'List WhatsApp Numbers',
  key: 'list_whatsapp_numbers',
  description:
    'List WhatsApp Business numbers integrated with your MSG91 account. Use a returned number with list_whatsapp_templates and send_whatsapp_message.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({ response: z.any().describe('Integrated numbers and their activation details') })
  )
  .handleInvocation(async ctx => {
    let client = new Msg91Client({ token: ctx.auth.token });
    let response = await client.getWhatsAppNumbers();
    return { output: { response }, message: 'Retrieved integrated WhatsApp numbers.' };
  })
  .build();
