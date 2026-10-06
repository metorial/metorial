import { SlateTool } from 'slates';
import { z } from 'zod';
import { RipplingClient } from '../lib/client';
import { requirePartnerOAuth } from '../lib/validation';
import { spec } from '../spec';

export let getSamlMetadata = SlateTool.create(spec, {
  name: 'Get SAML Metadata',
  key: 'get_saml_metadata',
  description: `Retrieve SAML IDP metadata for app integrations that have SAML enabled. The metadata is unique per customer app installation and changes with each new installation. Provides a downloadable XML metadata file. Requires a SAML-enabled v1 partner OAuth app installation.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      metadata: z
        .any()
        .describe(
          'Download metadata including filename and MIME type; XML contents are delivered as a file'
        )
    })
  )
  .authMethods(['oauth'])
  .handleInvocation(async ctx => {
    requirePartnerOAuth(ctx.auth, 'SAML metadata');
    new RipplingClient({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });
    await ctx.addAttachment({
      type: 'url',
      url: 'https://api.rippling.com/platform/api/saml/idp_metadata',
      headers: { Authorization: `Bearer ${ctx.auth.token}` },
      filename: 'rippling-idp-metadata.xml',
      mimeType: 'application/xml'
    });
    return {
      output: {
        metadata: { filename: 'rippling-idp-metadata.xml', mimeType: 'application/xml' }
      },
      message:
        'Prepared the SAML metadata file for download. The app installation must have SAML enabled.'
    };
  })
  .build();
