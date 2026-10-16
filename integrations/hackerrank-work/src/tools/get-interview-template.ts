import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';

import { spec } from '../spec';

export let getInterviewTemplate = SlateTool.create(spec, {
  key: 'get_interview_template',
  name: 'Get Interview Template',
  description:
    'Retrieve a interview template by ID. Call list_interview_templates to discover available IDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      templateId: z.string().describe('Resource ID from list_interview_templates')
    })
  )
  .output(
    z.object({
      template: z.record(z.string(), z.any()).describe('Complete provider resource')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getInterviewTemplate(ctx.input.templateId);
    return {
      message: 'Get interview template completed.',
      output: { template: result.data ?? result }
    };
  });
