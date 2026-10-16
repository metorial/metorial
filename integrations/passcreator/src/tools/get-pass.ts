import { isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPass = SlateTool.create(spec, {
  name: 'Get Pass',
  key: 'get_pass',
  description: `Retrieve the full details of a single pass by its identifier, userProvidedId, or barcodeValue. Returns all pass data including field values, status, stored value, and download URIs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      passId: z.string().describe('Pass identifier (UUID, userProvidedId, or barcodeValue)'),
      includeFieldMapping: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include field mapping with labels and values')
    })
  )
  .output(
    z.object({
      passId: z.string().describe('Unique identifier of the pass'),
      pass: z
        .record(z.string(), z.any())
        .describe('Full pass data including field values, status, stored value, and metadata'),
      downloadUris: z
        .object({
          iPhoneUri: z.string().optional().describe('Apple Wallet download URI'),
          androidUri: z.string().optional().describe('Google Wallet download URI')
        })
        .optional()
        .describe('Download URIs for the pass')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let pass = await client.getPass(ctx.input.passId, {
      includeFieldMapping: ctx.input.includeFieldMapping
    });

    let uris: { iPhoneUri?: string; androidUri?: string } | undefined;
    try {
      let result = await client.getPassUris(pass.identifier);
      uris = {
        iPhoneUri: result.iPhoneUri ?? undefined,
        androidUri: result.androidUri ?? result.AndroidUri ?? undefined
      };
    } catch (error) {
      if (
        !isApiErrorRecord(error) ||
        !isApiErrorRecord(error.data) ||
        Number(error.data.upstreamStatus) !== 404
      ) {
        throw error;
      }
    }
    if (uris?.iPhoneUri) {
      await ctx.addAttachment({
        type: 'url',
        url: uris.iPhoneUri,
        mimeType: 'application/vnd.apple.pkpass'
      });
    }

    return {
      output: {
        passId: pass.identifier || ctx.input.passId,
        pass,
        downloadUris: uris
      },
      message: `Retrieved pass \`${pass.identifier || ctx.input.passId}\`${pass.voided ? ' (voided)' : ''}.`
    };
  })
  .build();
