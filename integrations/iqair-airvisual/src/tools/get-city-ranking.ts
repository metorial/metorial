import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCityRanking = SlateTool.create(spec, {
  name: 'Get City AQI Ranking',
  key: 'get_city_ranking',
  description: `Retrieve a global ranking of major cities by current air quality index (AQI). Enables comparison of air quality across cities worldwide. Returns each city's name, location, and AQI values for both US and China standards.`,
  constraints: ['Requires an Enterprise plan.'],
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      cities: z
        .array(
          z.object({
            city: z.string().describe('City name'),
            state: z.string().describe('State/province name'),
            country: z.string().describe('Country name'),
            aqiUs: z.number().describe('Current AQI value (US EPA standard)'),
            aqiChina: z.number().describe('Current AQI value (China MEP standard)')
          })
        )
        .describe('Cities ranked by air quality'),
      count: z.number().describe('Total number of cities in the ranking')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Fetching global city AQI ranking...');
    let data = await client.getCityRanking();

    let cities = data.map(entry => ({
      city: entry.city,
      state: entry.state,
      country: entry.country,
      aqiUs: entry.ranking.current_aqi,
      aqiChina: entry.ranking.current_aqi_cn
    }));

    let output = {
      cities,
      count: cities.length
    };

    let top3 = cities
      .slice(0, 3)
      .map(c => `${c.city} (AQI ${c.aqiUs})`)
      .join(', ');

    return {
      output,
      message: `Ranked **${output.count} cities** by AQI. Top 3: ${top3}`
    };
  })
  .build();
