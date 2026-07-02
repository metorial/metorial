import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTrustedEntity = SlateTool.create(spec, {
  name: 'Manage Trusted Entity',
  key: 'manage_trusted_entity',
  description: `Create or update a trusted entity to restrict which issuers are accepted during credential verification. Trusted entities can include DIDs and X.509 certificates, and are linked to presentation templates.`,
  instructions: [
    'To create: omit trustedEntityId. To update: provide the trustedEntityId.',
    'Provide at least one DID or certificate for the trusted entity.'
  ]
})
  .input(
    z.object({
      trustedEntityId: z
        .string()
        .optional()
        .describe('ID of the trusted entity to update (omit to create)'),
      name: z.string().describe('Name of the trusted entity'),
      dids: z.array(z.string()).optional().describe('Array of trusted DID identifiers'),
      certificates: z
        .array(z.string())
        .optional()
        .describe('Array of X.509 certificate strings (PEM format)')
    })
  )
  .output(
    z.object({
      trustedEntityId: z.string().describe('ID of the trusted entity'),
      name: z.string().describe('Entity name'),
      dids: z.array(z.string()).optional().describe('Trusted DIDs'),
      certificates: z.array(z.string()).optional().describe('Trusted X.509 certificates'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
      updatedAt: z.string().optional().describe('ISO 8601 last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let result: any;
    let action: string;

    if (ctx.input.trustedEntityId) {
      result = await client.updateTrustedEntity(ctx.input.trustedEntityId, {
        name: ctx.input.name,
        dids: ctx.input.dids,
        certificates: ctx.input.certificates
      });
      action = 'Updated';
    } else {
      result = await client.createTrustedEntity({
        name: ctx.input.name,
        dids: ctx.input.dids,
        certificates: ctx.input.certificates
      });
      action = 'Created';
    }

    let data = result.data ?? result;

    return {
      output: {
        trustedEntityId: data.id,
        name: data.name,
        dids: data.dids,
        certificates: data.certificates,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      },
      message: `${action} trusted entity "${data.name}" with ID \`${data.id}\`.`
    };
  })
  .build();
