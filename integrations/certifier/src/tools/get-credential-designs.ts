import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCredentialDesigns = SlateTool.create(spec, {
  name: 'Get Credential Designs',
  key: 'get_credential_designs',
  description:
    'Retrieve the ordered designs rendered for a credential and prepare their available PNG or PDF files for download.',
  instructions: [
    'Preview URLs represent an immutable version of the rendered credential. Call this tool again after changing a design or displayed attribute to obtain the latest files.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      credentialId: z.string().describe('ID of the credential to retrieve designs for')
    })
  )
  .output(
    z.object({
      credentialId: z.string(),
      designs: z.array(
        z.object({
          designId: z.string(),
          name: z.string(),
          formats: z.array(z.enum(['png', 'pdf']))
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let designs = await new Client({ token: ctx.auth.token }).getCredentialDesigns(
      ctx.input.credentialId
    );
    for (let design of designs) {
      for (let preview of design.previews) {
        await ctx.addAttachment({
          type: 'url',
          url: preview.url,
          mimeType: preview.format === 'pdf' ? 'application/pdf' : 'image/png'
        });
      }
    }
    return {
      output: {
        credentialId: ctx.input.credentialId,
        designs: designs.map(design => ({
          designId: design.id,
          name: design.name,
          formats: design.previews.map(preview => preview.format)
        }))
      },
      message: `Retrieved **${designs.length}** rendered design(s) and prepared their available files for download.`
    };
  })
  .build();
