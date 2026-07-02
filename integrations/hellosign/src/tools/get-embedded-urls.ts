import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEmbeddedUrls = SlateTool.create(spec, {
  name: 'Get Embedded URLs',
  key: 'get_embedded_urls',
  description: `Get an embedded signing URL for a signer or an embedded editing URL for a template. These URLs are used to embed Dropbox Sign experiences into your application via iFrame. URLs are short-lived and expire quickly.`,
  instructions: [
    'Use type "sign" with a signatureId to get an embedded signing URL.',
    'Use type "edit" with a templateId to get an embedded template editing URL.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      type: z.enum(['sign', 'edit']).describe('Type of embedded URL to generate'),
      signatureId: z
        .string()
        .optional()
        .describe(
          'Signature ID (required for "sign" type, found in the signatures array of a request)'
        ),
      templateId: z.string().optional().describe('Template ID (required for "edit" type)'),
      skipSignerRoles: z
        .boolean()
        .optional()
        .describe('Skip signer roles step in template editor (for "edit" type)'),
      skipSubjectMessage: z
        .boolean()
        .optional()
        .describe('Skip subject/message step in template editor (for "edit" type)')
    })
  )
  .output(
    z.object({
      url: z.string().describe('Embedded URL for iFrame embedding'),
      expiresAt: z.string().describe('URL expiration timestamp (ISO 8601)'),
      type: z.string().describe('Type of URL generated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    if (ctx.input.type === 'sign') {
      if (!ctx.input.signatureId) {
        throw new Error('signatureId is required for embedded signing URLs');
      }

      let result = await client.getEmbeddedSignUrl(ctx.input.signatureId);

      return {
        output: {
          url: result.signUrl,
          expiresAt: new Date(result.expiresAt * 1000).toISOString(),
          type: 'sign'
        },
        message: `Embedded signing URL generated. Expires at ${new Date(result.expiresAt * 1000).toISOString()}.`
      };
    } else {
      if (!ctx.input.templateId) {
        throw new Error('templateId is required for embedded editing URLs');
      }

      let result = await client.getEmbeddedEditUrl(ctx.input.templateId, {
        skipSignerRoles: ctx.input.skipSignerRoles,
        skipSubjectMessage: ctx.input.skipSubjectMessage
      });

      return {
        output: {
          url: result.editUrl,
          expiresAt: new Date(result.expiresAt * 1000).toISOString(),
          type: 'edit'
        },
        message: `Embedded template edit URL generated. Expires at ${new Date(result.expiresAt * 1000).toISOString()}.`
      };
    }
  })
  .build();
