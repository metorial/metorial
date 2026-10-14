import { SlateTool } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

export let listForms = SlateTool.create(spec, {
  name: 'List Forms',
  key: 'list_forms',
  description: `List a page of forms in the organization, optionally searching by name or including archived forms. Use offset to retrieve further results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Forms per page; default 25, maximum 50'),
      offset: z.number().optional().describe('Number of matching forms to skip; default 0'),
      search: z.string().optional().describe('Search by form name'),
      includeArchived: z.boolean().optional().describe('Include archived forms')
    })
  )
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
        .describe('List of forms'),
      count: z.number().optional().describe('Total number of matching forms'),
      next: z.string().nullable().optional().describe('URL of the next page, or null'),
      previous: z.string().nullable().optional().describe('URL of the previous page, or null')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DailyBotClient({ token: ctx.auth.token });

    let result = await client.listForms(ctx.input);
    let forms = result?.results ?? result;

    let mapped = forms.map((f: any) => ({
      formUuid: f.uuid,
      name: f.name,
      isAnonymous: f.is_anonymous ?? f.collect_responses_anonymously,
      isActive: f.is_active ?? f.active,
      raw: f
    }));

    return {
      output: {
        forms: mapped,
        count: result?.count,
        next: result?.next,
        previous: result?.previous
      },
      message: `Found **${mapped.length}** form(s).`
    };
  })
  .build();
