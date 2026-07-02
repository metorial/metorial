import { SlateTool } from 'slates';
import { z } from 'zod';
import { IgnisignClient } from '../lib/client';
import { spec } from '../spec';

export let listSignatureProfiles = SlateTool.create(spec, {
  name: 'List Signature Profiles',
  key: 'list_signature_profiles',
  description: `Retrieve available signature profiles for the configured application and environment. Signature profiles define the signature mechanism, document types allowed, legally binding value, and integration mode (By-Side or Embedded).`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      signatureProfiles: z.array(z.any()).describe('List of available signature profiles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IgnisignClient({
      token: ctx.auth.token,
      appId: ctx.config.appId,
      appEnv: ctx.config.appEnv
    });

    let profiles = await client.listSignatureProfiles();
    let list = Array.isArray(profiles) ? profiles : [];

    return {
      output: {
        signatureProfiles: list
      },
      message: `Found **${list.length}** signature profile(s).`
    };
  })
  .build();
