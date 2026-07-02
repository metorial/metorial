import { SlateTool } from 'slates';
import { z } from 'zod';
import { CabinPandaClient } from '../lib/client';
import { spec } from '../spec';

export let listForms = SlateTool.create(spec, {
  name: 'List Forms',
  key: 'list_forms',
  description: `Retrieve all forms associated with the account. Returns a list of forms with their IDs, names, and metadata. Use this to browse available forms or find a specific form's ID for further operations.`,
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
            formId: z.string().optional().describe('Unique identifier (key) of the form'),
            name: z.string().optional().describe('Name of the form'),
            status: z.string().optional().describe('Current status of the form'),
            createdAt: z.string().optional().describe('When the form was created'),
            raw: z.any().optional().describe('Full form object from the API')
          })
        )
        .describe('List of forms')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CabinPandaClient({ token: ctx.auth.token });
    let forms = await client.listForms();

    let mappedForms = (Array.isArray(forms) ? forms : []).map((form: any) => ({
      formId: form?.key ?? form?.id?.toString(),
      name: form?.name,
      status: form?.status,
      createdAt: form?.created_at,
      raw: form
    }));

    return {
      output: { forms: mappedForms },
      message: `Found **${mappedForms.length}** form(s).`
    };
  })
  .build();
