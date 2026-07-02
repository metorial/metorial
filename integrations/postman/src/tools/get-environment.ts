import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEnvironmentTool = SlateTool.create(spec, {
  name: 'Get Environment',
  key: 'get_environment',
  description: `Retrieve a specific Postman environment with its full variable set, including key, value, type, and enabled status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      environmentId: z.string().describe('Environment ID or UID')
    })
  )
  .output(
    z.object({
      environmentId: z.string(),
      name: z.string(),
      uid: z.string().optional(),
      isPublic: z.boolean().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      values: z
        .array(
          z.object({
            key: z.string(),
            value: z.string(),
            type: z.string().optional(),
            enabled: z.boolean().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let env = await client.getEnvironment(ctx.input.environmentId);

    return {
      output: {
        environmentId: env.id,
        name: env.name,
        uid: env.uid,
        isPublic: env.isPublic,
        createdAt: env.createdAt,
        updatedAt: env.updatedAt,
        values: env.values?.map((v: any) => ({
          key: v.key,
          value: v.value,
          type: v.type,
          enabled: v.enabled
        }))
      },
      message: `Retrieved environment **"${env.name}"** with ${env.values?.length ?? 0} variable(s).`
    };
  })
  .build();
