import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GeocoderClient } from '../lib/client';
import { spec } from '../spec';

export let getGeocoderOptions = SlateTool.create(spec, {
  name: 'Get Geocoder Options',
  key: 'get_geocoder_options',
  description:
    'Discover available Census Geocoder address benchmarks and, for a selected benchmark, compatible geography vintages. Use the returned names or IDs with Geocode Address.',
  instructions: [
    'Call without a benchmark to list address benchmarks, then provide a benchmark ID or name to list its geography vintages.',
    'Geography vintages are tied to their address benchmark; choose a returned vintage when using a historical benchmark.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      benchmark: z
        .string()
        .optional()
        .describe(
          'Benchmark ID or name from this tool, such as 4 or Public_AR_Current; omit to list benchmarks only'
        )
    })
  )
  .output(
    z.object({
      benchmarks: z.array(
        z.object({
          id: z.string().describe('Benchmark ID accepted by the geocoder'),
          name: z.string().describe('Benchmark name accepted by the geocoder'),
          description: z.string().optional().describe('Address benchmark description'),
          isDefault: z.boolean().optional().describe('Whether this is the default benchmark')
        })
      ),
      benchmark: z
        .string()
        .optional()
        .describe('Selected benchmark ID used to retrieve vintages'),
      vintages: z
        .array(
          z.object({
            id: z.string().describe('Geography vintage ID'),
            name: z.string().describe('Geography vintage name'),
            description: z.string().optional().describe('Geography vintage description'),
            isDefault: z.boolean().optional().describe('Whether this is the default vintage')
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GeocoderClient();
    let benchmarks = await client.getBenchmarks();
    let selected =
      ctx.input.benchmark === undefined
        ? undefined
        : benchmarks.find(
            benchmark =>
              benchmark.id === ctx.input.benchmark ||
              benchmark.benchmarkName === ctx.input.benchmark
          );
    if (ctx.input.benchmark !== undefined && !selected) {
      throw createApiServiceError(
        'Choose a benchmark ID or name returned by Get Geocoder Options.'
      );
    }
    let vintages = selected ? await client.getVintages(selected.id) : undefined;
    return {
      output: {
        benchmarks: benchmarks.map(benchmark => ({
          id: benchmark.id,
          name: benchmark.benchmarkName,
          description: benchmark.benchmarkDescription,
          isDefault: benchmark.isDefault
        })),
        benchmark: selected?.id,
        vintages: vintages?.map(vintage => ({
          id: vintage.id,
          name: vintage.vintageName,
          description: vintage.vintageDescription,
          isDefault: vintage.isDefault
        }))
      },
      message: `Found **${benchmarks.length}** address benchmarks${selected ? ` and **${vintages?.length ?? 0}** geography vintages for ${selected.benchmarkName}` : ''}.`
    };
  })
  .build();
