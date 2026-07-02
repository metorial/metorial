import { SlateTool } from 'slates';
import { z } from 'zod';
import { FeatheryClient } from '../lib/client';
import { spec } from '../spec';

export let listForms = SlateTool.create(spec, {
  name: 'List Forms',
  key: 'list_forms',
  description: `List all forms in your Feathery account. Optionally filter by tags or active status. Returns form metadata including name, ID, enabled state, and tags.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tags: z.string().optional().describe('Filter forms by tag name'),
      active: z.boolean().optional().describe('Filter by active/enabled status')
    })
  )
  .output(
    z.object({
      forms: z
        .array(
          z.object({
            formId: z.string().describe('Unique form identifier'),
            formName: z.string().describe('Display name of the form'),
            enabled: z.boolean().optional().describe('Whether the form is active'),
            tags: z.array(z.string()).optional().describe('Tags assigned to the form')
          })
        )
        .describe('List of forms')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let forms = await client.listForms({
      tags: ctx.input.tags,
      active: ctx.input.active
    });

    let mapped = forms.map((f: any) => ({
      formId: f.id || f.form_id,
      formName: f.name || f.form_name,
      enabled: f.enabled,
      tags: f.tags
    }));

    return {
      output: { forms: mapped },
      message: `Found **${mapped.length}** form(s).`
    };
  })
  .build();
