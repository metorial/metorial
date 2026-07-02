import { SlateTool } from 'slates';
import { z } from 'zod';
import { GeoapifyClient } from '../lib/client';
import { spec } from '../spec';

let postcodeResultSchema = z.object({
  postcode: z.string().optional().describe('Postal code'),
  name: z.string().optional().describe('Place name'),
  city: z.string().optional().describe('City name'),
  county: z.string().optional().describe('County name'),
  state: z.string().optional().describe('State name'),
  country: z.string().optional().describe('Country name'),
  countryCode: z.string().optional().describe('ISO country code'),
  lat: z.number().optional().describe('Latitude'),
  lon: z.number().optional().describe('Longitude'),
  placeId: z.string().optional().describe('Place identifier'),
  geometry: z.any().optional().describe('GeoJSON geometry of postcode area')
});

export let lookupPostcodes = SlateTool.create(spec, {
  name: 'Lookup Postcodes',
  key: 'lookup_postcodes',
  description: `Search for postcodes by code or list postcodes within a geographic area. Use **search mode** to find details for a specific postcode, or **list mode** to enumerate postcodes within a bounding box or country. Optionally includes boundary geometry for each postcode area.`,
  instructions: [
    'For search: provide a postcode string and optionally a countryCode.',
    'For list: provide a countryCode and/or a filter (e.g. "rect:west,south,east,north").',
    'Set geometry to "original" to include polygon boundaries for postcode areas.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mode: z
        .enum(['search', 'list'])
        .describe(
          '"search" to find a specific postcode, "list" to enumerate postcodes in an area'
        ),
      postcode: z.string().optional().describe('Postcode string to search for (search mode)'),
      countryCode: z
        .string()
        .optional()
        .describe('ISO 3166-1 alpha-2 country code (e.g. "US", "DE")'),
      filter: z
        .string()
        .optional()
        .describe('Geographic filter for list mode (e.g. "rect:west,south,east,north")'),
      limit: z.number().optional().describe('Maximum results (list mode, max 500)'),
      offset: z.number().optional().describe('Pagination offset (list mode)'),
      geometry: z
        .string()
        .optional()
        .describe('Geometry type (e.g. "original" for full boundary polygons)')
    })
  )
  .output(
    z.object({
      postcodes: z.array(postcodeResultSchema).describe('Postcode results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GeoapifyClient({ token: ctx.auth.token });

    let data: any;
    if (ctx.input.mode === 'search') {
      data = await client.searchPostcodes({
        postcode: ctx.input.postcode,
        countryCode: ctx.input.countryCode,
        geometry: ctx.input.geometry
      });
    } else {
      data = await client.listPostcodes({
        countryCode: ctx.input.countryCode,
        filter: ctx.input.filter,
        limit: ctx.input.limit,
        offset: ctx.input.offset,
        geometry: ctx.input.geometry
      });
    }

    let features = data.features || data.results || [];
    let postcodes = features.map((item: any) => {
      let p = item.properties || item;
      let coords = item.geometry?.coordinates;
      return {
        postcode: p.postcode,
        name: p.name,
        city: p.city,
        county: p.county,
        state: p.state,
        country: p.country,
        countryCode: p.country_code,
        lat: p.lat ?? (coords && coords.length === 2 ? coords[1] : undefined),
        lon: p.lon ?? (coords && coords.length === 2 ? coords[0] : undefined),
        placeId: p.place_id,
        geometry: item.geometry
      };
    });

    return {
      output: { postcodes },
      message: `Found **${postcodes.length}** postcode(s) in ${ctx.input.mode} mode.`
    };
  })
  .build();
