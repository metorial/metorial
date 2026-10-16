import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listModules = SlateTool.create(spec, {
  name: 'List API Modules',
  key: 'list_api_modules',
  description:
    'Discover the current public API Labz marketplace modules, their IDs, and example request parameters. Use a module ID and its parameters with call_api_module. Hidden and account-specific custom modules are excluded.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      search: z.string().optional().describe('Filter module names and descriptions by text')
    })
  )
  .output(
    z.object({
      modules: z.array(
        z.object({
          moduleId: z.string(),
          name: z.string(),
          description: z.string().optional(),
          category: z.string().optional(),
          exampleParameters: z.unknown().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let modules = await client.listModules(ctx.input.search);
    return {
      output: { modules },
      message: `Found ${modules.length} public API Labz modules.`
    };
  })
  .build();
