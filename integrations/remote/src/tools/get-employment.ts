import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEmployment = SlateTool.create(spec, {
  name: 'Get Employment',
  key: 'get_employment',
  description: `Retrieve detailed information about a specific employment record, including personal details, employment status, contract information, onboarding progress, and country-specific fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      employmentId: z.string().describe('ID of the employment to retrieve')
    })
  )
  .output(
    z.object({
      employment: z.record(z.string(), z.any()).describe('Full employment record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.auth.environment ?? 'production'
    });

    let result = await client.getEmployment(ctx.input.employmentId);
    let employment = result?.data ?? result?.employment ?? result;

    return {
      output: {
        employment
      },
      message: `Retrieved employment **${employment?.full_name ?? ctx.input.employmentId}**.`
    };
  });
