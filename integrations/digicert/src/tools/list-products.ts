import { SlateTool } from 'slates';
import { z } from 'zod';
import { CertCentralClient } from '../lib/client';
import { spec } from '../spec';

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `List available DigiCert certificate products for your account. Use this to discover product name IDs needed when ordering certificates.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      products: z
        .array(
          z.object({
            productNameId: z.string().describe('Product name identifier used when ordering'),
            productName: z.string().describe('Human-readable product name'),
            productType: z.string().optional().describe('Product type category'),
            validationType: z.string().optional().describe('Validation level (ov, ev, etc.)')
          })
        )
        .describe('Available certificate products')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CertCentralClient({
      token: ctx.auth.token,
      platform: ctx.config.platform
    });

    let result = await client.listProducts();

    let products = (result.products || []).map((p: any) => ({
      productNameId: p.name_id,
      productName: p.name,
      productType: p.type,
      validationType: p.validation_type
    }));

    return {
      output: { products },
      message: `Found **${products.length}** available certificate product(s).`
    };
  })
  .build();
