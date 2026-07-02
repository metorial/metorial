import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listScanners = SlateTool.create(spec, {
  name: 'List Scanners',
  key: 'list_scanners',
  description: `List all scanner configurations in your PassSlot account. Scanners are used with the Pass Verifier app to scan, validate, and redeem passes.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      scanners: z
        .array(
          z.object({
            scannerId: z.number().describe('Scanner identifier'),
            name: z.string().describe('Scanner display name'),
            type: z.string().describe('Scanner type (PassVerifier or Browser)'),
            fullAccess: z.boolean().describe('Whether the scanner has full access'),
            allowedTemplates: z
              .array(z.number())
              .optional()
              .describe('Template IDs the scanner can access')
          })
        )
        .describe('List of scanner configurations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let scanners = await client.listScanners();

    let mapped = scanners.map((s: any) => ({
      scannerId: s.id,
      name: s.name,
      type: s.type,
      fullAccess: s.fullAccess,
      allowedTemplates: s.allowedTemplates
    }));

    return {
      output: { scanners: mapped },
      message: `Found **${mapped.length}** scanner(s).`
    };
  })
  .build();
