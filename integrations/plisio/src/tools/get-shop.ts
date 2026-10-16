import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { PlisioClient } from '../lib/client';
import { optionalValue, providerBoolean, readRecord, validateOutput } from '../lib/response';
import { spec } from '../spec';

let outputSchema = z.object({
  name: z.string().optional().describe('Shop name associated with the API key'),
  link: z.string().optional().describe('Shop website'),
  logo: z.string().optional().describe('Shop logo URL'),
  whiteLabel: z.boolean().optional().describe('Whether white-label processing is enabled'),
  verified: z.boolean().optional().describe('Whether the shop domain is verified'),
  raw: z
    .record(z.string(), z.unknown())
    .describe('Original shop response with credentials removed')
});

export let getShop = SlateTool.create(spec, {
  name: 'Get Current Shop',
  key: 'get_shop',
  description:
    'Identify the shop associated with your API key and inspect its website, verification, and white-label settings.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new PlisioClient({ token: ctx.auth.token });
    let result = readRecord(await client.getShop());
    if (
      !(typeof result.name === 'string' && result.name.trim()) &&
      !(typeof result.link === 'string' && result.link.trim())
    ) {
      throw createApiServiceError(
        'Plisio returned shop details without an identifying name or website.'
      );
    }
    return {
      output: validateOutput(outputSchema, {
        name: optionalValue(result.name),
        link: optionalValue(result.link),
        logo: optionalValue(result.logo),
        whiteLabel: providerBoolean(result.white_label),
        verified: providerBoolean(result.verified),
        raw: result
      }),
      message: client.redact(`Retrieved current shop ${result.name ?? result.link}.`)
    };
  })
  .build();
