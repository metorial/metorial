import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getModuleId = SlateTool.create(spec, {
  name: 'Get Module ID',
  key: 'get_module_id',
  description:
    'Resolve the Salesmate module ID for a module API name, including custom modules. Use this ID when addressing record notes in a custom module.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      internalName: z
        .string()
        .min(1)
        .describe('Module API name, such as cm_electronic_gadget for a custom module')
    })
  )
  .output(
    z.object({
      moduleId: z.number().describe('Resolved module ID'),
      module: z.unknown().describe('Module details returned by Salesmate')
    })
  )
  .handleInvocation(async ctx => {
    let result = await createClient(ctx).getModuleId(ctx.input.internalName);
    let data: unknown = result?.Data;
    let id = isApiErrorRecord(data) ? (data.id ?? data.moduleId) : data;
    let moduleId =
      typeof id === 'number'
        ? id
        : typeof id === 'string' && /^\d+$/.test(id)
          ? Number(id)
          : undefined;
    if (moduleId === undefined || !Number.isSafeInteger(moduleId) || moduleId < 1) {
      throw createApiServiceError(
        'Salesmate did not return a valid module ID for that API name.',
        { reason: 'salesmate_invalid_response' }
      );
    }
    return {
      output: { moduleId, module: data },
      message: `Module **${ctx.input.internalName}** has ID \`${moduleId}\`.`
    };
  })
  .build();
