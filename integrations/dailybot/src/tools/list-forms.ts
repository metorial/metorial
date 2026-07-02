import { SlateTool } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

export let listForms = SlateTool.create(spec, {
  name: 'List Forms',
  key: 'list_forms',
  description: `List all forms visible to the authenticated user. Forms support anonymous responses, privacy settings, and date-bounded availability.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      forms: z
        .array(
          z.object({
            formUuid: z.string().describe('UUID of the form'),
            name: z.string().describe('Name of the form'),
            isAnonymous: z.boolean().optional().describe('Whether responses are anonymous'),
            isActive: z.boolean().optional().describe('Whether the form is currently active'),
            raw: z.any().describe('Full form object from the API')
          })
        )
        .describe('List of forms')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DailyBotClient({ token: ctx.auth.token });

    let forms = await client.listForms();

    let mapped = forms.map((f: any) => ({
      formUuid: f.uuid,
      name: f.name,
      isAnonymous: f.is_anonymous,
      isActive: f.is_active ?? f.active,
      raw: f
    }));

    return {
      output: { forms: mapped },
      message: `Found **${mapped.length}** form(s).`
    };
  })
  .build();
