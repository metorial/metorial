import { SlateTool } from 'slates';
import { z } from 'zod';
import { RipplingClient } from '../lib/client';
import { spec } from '../spec';

export let getSamlMetadata = SlateTool.create(spec, {
  name: 'Get SAML Metadata',
  key: 'get_saml_metadata',
  description: `Retrieve SAML IDP metadata for app integrations that have SAML enabled. The metadata is unique per customer app installation and changes with each new installation. Returns XML-formatted SAML metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      metadata: z.any().describe('SAML IDP metadata (typically XML format)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RipplingClient({ token: ctx.auth.token });
    let metadata = await client.getSamlMetadata();

    return {
      output: {
        metadata
      },
      message: `Retrieved SAML IDP metadata.`
    };
  })
  .build();
