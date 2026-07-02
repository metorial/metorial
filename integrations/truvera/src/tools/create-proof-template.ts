import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createProofTemplate = SlateTool.create(spec, {
  name: 'Create Proof Template',
  key: 'create_proof_template',
  description: `Create a reusable verification template that defines which credentials, schemas, attributes, and conditions are required for proof requests. Uses the DIF Presentation Exchange (PEX) syntax. Templates can be reused to generate multiple proof requests.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateName: z.string().describe('Name for the proof template'),
      purpose: z.string().optional().describe('Purpose description for the verification'),
      inputDescriptors: z
        .array(z.any())
        .describe(
          'DIF Presentation Exchange input descriptors defining credential requirements'
        ),
      verifierDid: z.string().optional().describe('DID of the verifier'),
      expirationAmount: z
        .string()
        .optional()
        .describe('Expiration duration amount (e.g. "30")'),
      expirationUnit: z
        .string()
        .optional()
        .describe('Expiration duration unit (e.g. "days", "hours")')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('ID of the created proof template'),
      template: z.any().describe('Full proof template details')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let body: Record<string, any> = {
      name: ctx.input.templateName,
      request: {
        name: ctx.input.templateName,
        purpose: ctx.input.purpose,
        input_descriptors: ctx.input.inputDescriptors
      },
      did: ctx.input.verifierDid
    };

    if (ctx.input.expirationAmount && ctx.input.expirationUnit) {
      body.expirationTime = {
        amount: ctx.input.expirationAmount,
        unit: ctx.input.expirationUnit
      };
    }

    let result = await client.createProofTemplate(body);

    return {
      output: {
        templateId: result?.id || '',
        template: result
      },
      message: `Created proof template **${ctx.input.templateName}** with ID **${result?.id}**.`
    };
  })
  .build();
