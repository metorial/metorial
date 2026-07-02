import { SlateTool } from 'slates';
import { z } from 'zod';
import { DeveloperClient } from '../lib/client';
import { spec } from '../spec';

export let getHardwareTool = SlateTool.create(spec, {
  name: 'Get Hardware',
  key: 'get_hardware',
  description: `Retrieve mining hardware specifications including hashrate benchmarks, power consumption, and technical specs for GPUs and ASIC devices. Filter by hardware type or manufacturer brand. Useful for comparing mining equipment performance and efficiency.`,
  constraints: [
    'Requires a Developer API key from the minerstat Developer Portal',
    'Each request counts toward your monthly subscription quota'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      hardwareType: z.enum(['gpu', 'asic']).optional().describe('Filter by hardware category'),
      brand: z
        .string()
        .optional()
        .describe('Filter by manufacturer brand (e.g. "nvidia", "amd", "antminer")')
    })
  )
  .output(
    z.object({
      devices: z.array(
        z.object({
          hardwareId: z.string().describe('Unique hardware identifier'),
          name: z.string().describe('Hardware device name'),
          slug: z.string().describe('URL slug for the hardware'),
          hardwareType: z.string().describe('Category: "gpu" or "asic"'),
          brand: z.string().describe('Manufacturer brand'),
          algorithms: z
            .record(
              z.string(),
              z.object({
                hashrate: z.number().describe('Hashrate in H/s for this algorithm'),
                power: z.number().describe('Power consumption in watts for this algorithm')
              })
            )
            .describe('Supported algorithms with hashrate and power benchmarks'),
          specs: z
            .record(z.string(), z.any())
            .describe('Technical specifications (clock speeds, memory, etc.)')
        })
      ),
      totalCount: z.number().describe('Number of devices returned')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.developerApiKey) {
      throw new Error(
        'Developer API key is required to query hardware data. Please provide it in your authentication credentials.'
      );
    }

    let client = new DeveloperClient({ developerApiKey: ctx.auth.developerApiKey });

    let params: { type?: string; brand?: string } = {};
    if (ctx.input.hardwareType) params.type = ctx.input.hardwareType;
    if (ctx.input.brand) params.brand = ctx.input.brand;

    ctx.progress('Fetching hardware data from minerstat...');
    let hardware = await client.getHardware(
      Object.keys(params).length > 0 ? params : undefined
    );

    let mapped = hardware.map(h => ({
      hardwareId: h.id,
      name: h.name,
      slug: h.url,
      hardwareType: h.type,
      brand: h.brand,
      algorithms: h.algorithms,
      specs: h.specs
    }));

    let filterDesc: any[] = [];
    if (ctx.input.hardwareType) filterDesc.push(`type: ${ctx.input.hardwareType}`);
    if (ctx.input.brand) filterDesc.push(`brand: ${ctx.input.brand}`);
    let filterText = filterDesc.length > 0 ? ` (filtered by ${filterDesc.join(', ')})` : '';

    return {
      output: {
        devices: mapped,
        totalCount: mapped.length
      },
      message: `Retrieved **${mapped.length}** hardware devices${filterText}.`
    };
  })
  .build();
