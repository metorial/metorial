import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let obtainBundle = SlateTool.create(spec, {
  name: 'Obtain Bundle',
  key: 'obtain_bundle',
  description: `Obtain a license bundle for a licensee. This creates licenses from all templates in the bundle and assigns them to the specified licensee in a single operation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      bundleNumber: z.string().describe('Bundle number to obtain'),
      licenseeNumber: z.string().describe('Licensee number to receive the licenses')
    })
  )
  .output(
    z.object({
      licenses: z
        .array(
          z.object({
            licenseNumber: z.string().describe('Created license number'),
            licenseeNumber: z.string().optional().describe('Licensee number'),
            licenseTemplateNumber: z.string().optional().describe('Template number'),
            productModuleNumber: z.string().optional().describe('Module number'),
            name: z.string().optional().describe('License name'),
            active: z.boolean().optional().describe('Whether active')
          })
        )
        .describe('List of created licenses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let items = await client.obtainBundle(ctx.input.bundleNumber, ctx.input.licenseeNumber);
    let licenses = items.map(item => ({
      licenseNumber: item.number,
      licenseeNumber: item.licenseeNumber,
      licenseTemplateNumber: item.licenseTemplateNumber,
      productModuleNumber: item.productModuleNumber,
      name: item.name,
      active: item.active
    }));
    return {
      output: { licenses },
      message: `Obtained bundle **${ctx.input.bundleNumber}** for licensee **${ctx.input.licenseeNumber}**. Created **${licenses.length}** license(s).`
    };
  })
  .build();
