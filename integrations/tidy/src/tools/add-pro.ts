import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addPro = SlateTool.create(spec, {
  name: 'Add Pro',
  key: 'add_pro',
  description: `Add a service professional to your TIDY priority list. Pros are cleaning or maintenance professionals who can be assigned to jobs at your properties.`
})
  .input(
    z.object({
      name: z.string().describe('Full name of the professional'),
      email: z.string().describe('Email address of the professional'),
      phone: z.string().optional().describe('Phone number of the professional'),
      serviceTypes: z
        .string()
        .optional()
        .describe('Service types the pro offers (defaults to "regular_cleaning")')
    })
  )
  .output(
    z.object({
      proId: z.string().describe('Unique identifier for the pro'),
      name: z.string().describe('Full name of the professional'),
      email: z.string().describe('Email address of the professional'),
      phone: z.string().nullable().describe('Phone number'),
      serviceTypes: z.string().nullable().describe('Service types the pro offers'),
      createdAt: z.string().nullable().describe('Timestamp when the pro was added')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.addPro(ctx.input);

    return {
      output: {
        proId: result.id,
        name: result.name,
        email: result.email,
        phone: result.phone ?? null,
        serviceTypes: result.service_types ?? null,
        createdAt: result.created_at ?? null
      },
      message: `Added pro **${result.name}** (${result.email}) to your priority list.`
    };
  })
  .build();
