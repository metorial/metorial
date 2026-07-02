import { SlateTool } from 'slates';
import { z } from 'zod';
import { DopplerClient } from '../lib/client';
import { spec } from '../spec';

export let getWorkplace = SlateTool.create(spec, {
  name: 'Get Workplace',
  key: 'get_workplace',
  description: `Retrieve details about the current Doppler workplace, including its name and contact emails. Useful for verifying which workplace your token is connected to.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      workplaceId: z.string().describe('Workplace unique identifier'),
      name: z.string().describe('Workplace name'),
      billingEmail: z.string().optional().describe('Billing contact email'),
      securityEmail: z.string().optional().describe('Security contact email')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DopplerClient({ token: ctx.auth.token });

    let workplace = await client.getWorkplace();

    return {
      output: {
        workplaceId: workplace.id,
        name: workplace.name,
        billingEmail: workplace.billing_email,
        securityEmail: workplace.security_email
      },
      message: `Connected to workplace **${workplace.name}** (ID: ${workplace.id}).`
    };
  })
  .build();
