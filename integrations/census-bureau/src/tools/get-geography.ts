import { SlateTool } from 'slates';
import { z } from 'zod';
import { CensusDataClient } from '../lib/client';
import { spec } from '../spec';

let geographyLevelSchema = z.object({
  name: z.string().describe('Geography level name (e.g., "state", "county", "tract")'),
  geoLevelDisplay: z.string().optional().describe('Display name for the geography level'),
  referenceDate: z
    .string()
    .optional()
    .describe('Reference date for the geography definitions'),
  requires: z
    .array(z.string())
    .optional()
    .describe('Parent geography levels required in the "in" clause'),
  wildcards: z
    .array(z.string())
    .optional()
    .describe('Geography levels that support wildcard (*) queries'),
  optionalWithWCFor: z.string().optional().describe('Optional wildcard support description')
});

export let getGeography = SlateTool.create(spec, {
  name: 'Get Supported Geographies',
  key: 'get_supported_geographies',
  description: `Get the supported geography levels and their hierarchy for a Census Bureau dataset. Returns which geographic levels (state, county, tract, block group, etc.) are available for querying, along with the required parent geographies.

Use this to understand how to construct the \`forGeography\` and \`inGeography\` parameters for the Query Census Data tool.`,
  instructions: [
    'Each geography level may require parent geographies in the "in" clause.',
    'For example, querying tracts typically requires "state:XX county:YYY" in the inGeography parameter.',
    'Use the FIPS codes returned by the Geocode Address tool to construct geography queries.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dataset: z.string().describe('Dataset path (e.g., "acs/acs5", "dec/pl")'),
      vintage: z.string().optional().describe('Vintage year (e.g., "2022")')
    })
  )
  .output(
    z.object({
      geographies: z
        .array(geographyLevelSchema)
        .describe('List of supported geography levels with hierarchy requirements'),
      totalLevels: z.number().describe('Total number of geography levels supported')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CensusDataClient(ctx.auth.token);

    let geoData = await client.getDatasetGeography({
      dataset: ctx.input.dataset,
      vintage: ctx.input.vintage
    });

    let geographies = geoData.map((geo: any) => ({
      name: geo.name || '',
      geoLevelDisplay: geo.geoLevelDisplay || undefined,
      referenceDate: geo.referenceDate || undefined,
      requires: geo.requires
        ? geo.requires.map((r: any) => (typeof r === 'string' ? r : r.toString()))
        : undefined,
      wildcards: geo.wildcard
        ? Array.isArray(geo.wildcard)
          ? geo.wildcard
          : [geo.wildcard]
        : undefined,
      optionalWithWCFor: geo.optionalWithWCFor || undefined
    }));

    return {
      output: {
        geographies,
        totalLevels: geographies.length
      },
      message: `Dataset **${ctx.input.dataset}**${ctx.input.vintage ? ` (${ctx.input.vintage})` : ''} supports **${geographies.length}** geography levels.`
    };
  })
  .build();
