import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateEmployment = SlateTool.create(spec, {
  name: 'Update Employment',
  key: 'update_employment',
  description: `Update an existing employment record in Remote. Can modify personal information, employment details, administrative information, and other country-specific fields. Also supports inviting the employee to start self-enrollment on the Remote platform.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      employmentId: z.string().describe('ID of the employment to update'),
      basicInformation: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated basic information fields'),
      personalInformation: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated personal information fields'),
      employmentDetails: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated employment detail fields'),
      administrativeDetails: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated administrative detail fields'),
      invite: z
        .boolean()
        .optional()
        .describe('If true, also invite the employee to start self-enrollment after update')
    })
  )
  .output(
    z.object({
      employment: z.record(z.string(), z.any()).describe('Updated employment record'),
      invited: z.boolean().optional().describe('Whether the employee was invited')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.auth.environment ?? 'production'
    });

    let data: Record<string, any> = {};
    if (ctx.input.basicInformation) data.basic_information = ctx.input.basicInformation;
    if (ctx.input.personalInformation)
      data.personal_information = ctx.input.personalInformation;
    if (ctx.input.employmentDetails) data.employment_details = ctx.input.employmentDetails;
    if (ctx.input.administrativeDetails)
      data.administrative_details = ctx.input.administrativeDetails;

    let result = await client.updateEmployment(ctx.input.employmentId, data);
    let employment = result?.data ?? result?.employment ?? result;

    let invited = false;
    if (ctx.input.invite) {
      await client.inviteEmployment(ctx.input.employmentId);
      invited = true;
    }

    return {
      output: {
        employment,
        invited
      },
      message: `Updated employment **${ctx.input.employmentId}**${invited ? ' and sent enrollment invitation' : ''}.`
    };
  });
