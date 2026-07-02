import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLocations = SlateTool.create(spec, {
  name: 'List Locations',
  key: 'list_locations',
  description: `Browse the IQAir location directory hierarchically. Lists supported countries, states within a country, cities within a state, or monitoring stations within a city. Use this to discover valid location names before querying air quality data.`,
  instructions: [
    'Call with no parameters to list all countries.',
    'Provide country to list its states.',
    'Provide country + state to list cities.',
    'Provide country + state + city to list monitoring stations (Startup+ plans).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      country: z
        .string()
        .optional()
        .describe('Country name to list states for. Omit to list all countries.'),
      state: z
        .string()
        .optional()
        .describe('State name to list cities for. Requires country.'),
      city: z
        .string()
        .optional()
        .describe(
          'City name to list stations for. Requires country and state. Startup+ plans only.'
        )
    })
  )
  .output(
    z.object({
      level: z
        .enum(['countries', 'states', 'cities', 'stations'])
        .describe('The level of the location hierarchy returned'),
      locations: z.array(z.string()).describe('List of location names at the requested level'),
      count: z.number().describe('Total number of locations returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { country, state, city } = ctx.input;

    let level: 'countries' | 'states' | 'cities' | 'stations';
    let locations: string[];

    if (city && state && country) {
      ctx.progress(`Listing stations in ${city}, ${state}, ${country}...`);
      let result = await client.listStations(country, state, city);
      level = 'stations';
      locations = result.map(s => s.station);
    } else if (state && country) {
      ctx.progress(`Listing cities in ${state}, ${country}...`);
      let result = await client.listCities(country, state);
      level = 'cities';
      locations = result.map(c => c.city);
    } else if (country) {
      ctx.progress(`Listing states in ${country}...`);
      let result = await client.listStates(country);
      level = 'states';
      locations = result.map(s => s.state);
    } else {
      ctx.progress('Listing all supported countries...');
      let result = await client.listCountries();
      level = 'countries';
      locations = result.map(c => c.country);
    }

    let output = {
      level,
      locations,
      count: locations.length
    };

    let preview = locations.slice(0, 10).join(', ');
    let suffix = locations.length > 10 ? ` and ${locations.length - 10} more` : '';

    return {
      output,
      message: `Found **${output.count} ${level}**: ${preview}${suffix}`
    };
  })
  .build();
