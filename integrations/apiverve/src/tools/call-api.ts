import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  assertFileReferenceSafe,
  type GeneratedFileReference,
  getGeneratedDownloads,
  qrRefreshAt,
  regeneratableFileEndpoints
} from '../lib/files';
import { spec } from '../spec';

export let callApi = SlateTool.create(spec, {
  name: 'Call Any API',
  key: 'call_api',
  description: `Call a documented APIVerve JSON GET or POST endpoint by name and parameters. Use this for utility APIs not covered by dedicated tools, such as UUID generation, barcode generation, or WHOIS lookup. Results that include a downloadURL are also prepared as downloadable files.

Browse available endpoints at [docs.apiverve.com/api-endpoints](https://docs.apiverve.com/api-endpoints).`,
  instructions: [
    'The endpoint should be the path segment after /v1/, e.g. "translator", "uuidgenerator", "barcodegenerator".',
    'Use the HTTP method documented for the chosen endpoint.',
    'Parameters are passed as query params for GET or request body for POST.',
    'QR and barcode download links can be renewed by repeating the generation request, which uses the normal API credits.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      endpoint: z
        .string()
        .describe('The API endpoint name (e.g. "translator", "uuidgenerator", "whoislookup")'),
      method: z.enum(['GET', 'POST']).describe('HTTP method to use'),
      parameters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Parameters to send with the request (query params for GET, body for POST)')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API'),
      responseData: z.any().describe('Response data from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let endpoint = ctx.input.endpoint.startsWith('/')
      ? ctx.input.endpoint
      : `/${ctx.input.endpoint}`;

    let canRegenerate =
      ctx.input.method === 'POST' &&
      regeneratableFileEndpoints.has(client.getEndpointName(endpoint));
    if (canRegenerate)
      assertFileReferenceSafe({ endpoint, parameters: ctx.input.parameters }, ctx.auth.token);

    let result = await client.callEndpoint(endpoint, ctx.input.method, ctx.input.parameters);

    for (let file of getGeneratedDownloads(result.data)) {
      if (canRegenerate) {
        if (file.expires === undefined)
          throw createApiServiceError(
            'APIVerve returned a generated file without its expiration.'
          );
        let reference: GeneratedFileReference = {
          kind: 'generated_file',
          endpoint,
          parameters: ctx.input.parameters,
          path: file.path
        };
        assertFileReferenceSafe(reference, ctx.auth.token);
        await ctx.addAttachment({
          type: 'url',
          url: file.url,
          refreshAt: qrRefreshAt(file.expires),
          refreshReference: reference
        });
      } else {
        await ctx.addAttachment({ type: 'url', url: file.url });
      }
    }

    let output = {
      status: result.status,
      responseData: client.sanitize(result.data)
    };

    return {
      output,
      message: 'APIVerve API call completed successfully.'
    };
  })
  .build();
