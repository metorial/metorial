import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { baseIdSchema, optionalString, requireRecord, requireString } from '../lib/schemas';
import { spec } from '../spec';

let baseOutput = z.object({
  baseId: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  raw: z.any().describe('Complete provider base metadata')
});

let mapBase = (value: unknown) => {
  let base = requireRecord(value, 'base');
  return {
    baseId: requireString(base.id, 'base ID'),
    title: optionalString(base.title),
    description: optionalString(base.description),
    raw: base
  };
};

export let getBase = SlateTool.create(spec, {
  key: 'get_base',
  name: 'Get Base',
  description:
    'Read base metadata, including its data source IDs. Call list_bases to discover base IDs.',
  tags: { readOnly: true }
})
  .input(z.object({ baseId: baseIdSchema }))
  .output(baseOutput)
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let output = mapBase(await client.getBase(ctx.input.baseId));
    return { output, message: `Retrieved base \`${output.baseId}\`.` };
  })
  .build();

export let createBase = SlateTool.create(spec, {
  key: 'create_base',
  name: 'Create Base',
  description:
    'Create a NocoDB base. Optionally choose a workspace on deployments supporting workspace-specific creation.',
  tags: { destructive: false }
})
  .input(
    z.object({
      title: z.string().min(1).max(128).describe('Base title'),
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID, available from existing base metadata returned by get_base.'),
      description: z.string().optional(),
      color: z.string().optional(),
      meta: z.any().optional()
    })
  )
  .output(baseOutput)
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let { workspaceId, ...data } = ctx.input;
    let output = mapBase(await client.createBase(data, workspaceId));
    return { output, message: `Created base \`${output.baseId}\`.` };
  })
  .build();

export let updateBase = SlateTool.create(spec, {
  key: 'update_base',
  name: 'Update Base',
  description:
    'Update a base title, description, color, or metadata. Call list_bases to discover base IDs.',
  tags: { destructive: false }
})
  .input(
    z.object({
      baseId: baseIdSchema,
      title: z.string().min(1).max(128).optional(),
      description: z.string().optional(),
      color: z.string().optional(),
      meta: z.any().optional()
    })
  )
  .output(z.object({ baseId: z.string(), success: z.boolean(), raw: z.any() }))
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let { baseId, ...input } = ctx.input;
    let data = pickDefined(input);
    if (!Object.keys(data).length)
      throw createApiServiceError('Provide at least one base property to update.');
    let raw = await client.updateBase(baseId, data);
    if (raw === false) throw createApiServiceError('NocoDB did not confirm the base update.');
    return { output: { baseId, success: true, raw }, message: `Updated base \`${baseId}\`.` };
  })
  .build();

export let deleteBase = SlateTool.create(spec, {
  key: 'delete_base',
  name: 'Delete Base',
  description: 'Delete a NocoDB base and its resources. Call list_bases to discover base IDs.',
  tags: { destructive: true }
})
  .input(z.object({ baseId: baseIdSchema }))
  .output(z.object({ baseId: z.string(), success: z.boolean(), raw: z.any() }))
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let raw = await client.deleteBase(ctx.input.baseId);
    if (raw === false) throw createApiServiceError('NocoDB did not confirm base deletion.');
    return {
      output: { baseId: ctx.input.baseId, success: true, raw },
      message: `Deleted base \`${ctx.input.baseId}\`.`
    };
  })
  .build();
