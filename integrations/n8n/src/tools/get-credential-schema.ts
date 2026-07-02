import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCredentialSchema = SlateTool.create(spec, {
  name: 'Get Credential Schema',
  key: 'get_credential_schema',
  description: `Retrieve the JSON schema for a specific credential type. This is useful for understanding the required fields and their types before creating a credential.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      credentialTypeName: z
        .string()
        .describe(
          'The credential type name (e.g. "slackApi", "githubApi", "googleSheetsOAuth2Api")'
        )
    })
  )
  .output(
    z.object({
      schema: z.any().describe('JSON schema describing the credential fields and their types')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let schema = await client.getCredentialSchema(ctx.input.credentialTypeName);

    return {
      output: {
        schema
      },
      message: `Retrieved schema for credential type **${ctx.input.credentialTypeName}**.`
    };
  })
  .build();
