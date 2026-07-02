import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let assessPortFraudRisk = SlateTool.create(spec, {
  name: 'Assess Port Fraud Risk',
  key: 'assess_port_fraud_risk',
  description: `Assess the risk of port-out fraud for a phone number based on recent porting activity. Combines historical porting data with real-time network signaling checks to evaluate the likelihood of fraudulent porting.`,
  instructions: ['Phone numbers must be in E.164 format (e.g., +16502530000)'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      phoneNumber: z.string().describe('Phone number in E.164 format (e.g., +16502530000)')
    })
  )
  .output(
    z.object({
      fraudRisk: z.any().optional().describe('Port-out fraud risk assessment data'),
      status: z.number().optional().describe('Status code (0 = success)'),
      statusMessage: z.string().optional().describe('Status message'),
      rawResponse: z.any().optional().describe('Full raw API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getPortFraudRisk(ctx.input.phoneNumber);

    return {
      output: {
        fraudRisk: result.port_fraud || result.fraud_risk || result.risk,
        status: result.status,
        statusMessage: result.status_message,
        rawResponse: result
      },
      message: `Assessed port-out fraud risk for **${ctx.input.phoneNumber}**.`
    };
  })
  .build();
