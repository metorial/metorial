import { SlateTool } from 'slates';
import { z } from 'zod';
import { FormsiteClient } from '../lib/client';
import { spec } from '../spec';

export let listForms = SlateTool.create(spec, {
  name: 'List Forms',
  key: 'list_forms',
  description: `Retrieve all forms in the Formsite account or details for a specific form. Returns form name, description, open/close state, publish link, embed code, file storage size, and results count. Use this to discover available forms and their current status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      formDir: z
        .string()
        .optional()
        .describe(
          'Specific form directory to retrieve details for. If omitted, returns all forms in the account.'
        )
    })
  )
  .output(
    z.object({
      forms: z
        .array(
          z.object({
            formDir: z.string().describe('Form directory identifier'),
            name: z.string().describe('Form name'),
            description: z.string().describe('Form description'),
            state: z.string().describe('Form state (e.g., open, closed)'),
            publishUrl: z.string().describe('Public URL for the form'),
            embedCode: z.string().describe('HTML embed code for the form'),
            filesSize: z.number().describe('Total file storage size in bytes'),
            resultsCount: z.number().describe('Number of submissions/results')
          })
        )
        .describe('List of forms')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FormsiteClient({
      token: ctx.auth.token,
      server: ctx.config.server,
      userDir: ctx.config.userDir
    });

    let forms: any;
    if (ctx.input.formDir) {
      let form = await client.getForm(ctx.input.formDir);
      forms = [form];
    } else {
      forms = await client.listForms();
    }

    return {
      output: { forms },
      message: ctx.input.formDir
        ? `Retrieved details for form **${forms[0]?.name || ctx.input.formDir}** (${forms[0]?.state || 'unknown'} state, ${forms[0]?.resultsCount || 0} results).`
        : `Found **${forms.length}** form(s) in the account.`
    };
  })
  .build();
