import { SlateTool } from 'slates';
import { z } from 'zod';
import { FormdeskClient } from '../lib/client';
import { spec } from '../spec';

export let getFormFilters = SlateTool.create(spec, {
  name: 'Get Form Filters',
  key: 'get_form_filters',
  description: `Retrieves the list of pre-defined filters (views) configured on a form. These filters can be used with the **Get Form Results** tool to narrow down result queries.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formName: z.string().describe('Name or identifier of the form to retrieve filters for')
    })
  )
  .output(
    z.object({
      filters: z.array(
        z.object({
          filterId: z.string().describe('Unique identifier of the filter'),
          filterName: z.string().describe('Display name of the filter')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new FormdeskClient({
      token: ctx.auth.token,
      host: ctx.auth.host,
      domain: ctx.auth.domain
    });

    ctx.progress('Fetching form filters...');
    let filters = await client.getFormFilters(ctx.input.formName);

    let mapped = filters.map((f: any) => ({
      filterId: String(f.id || f.name || ''),
      filterName: String(f.name || f.title || f.id || '')
    }));

    return {
      output: { filters: mapped },
      message: `Found **${mapped.length}** filter(s) for form "${ctx.input.formName}".`
    };
  })
  .build();
