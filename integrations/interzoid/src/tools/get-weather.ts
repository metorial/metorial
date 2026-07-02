import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getWeather = SlateTool.create(spec, {
  name: 'Get Weather',
  key: 'get_weather',
  description: `Get current weather data by **US zip code** or **global location name**. Returns temperature (Fahrenheit and Celsius), weather conditions, wind speed, wind direction, humidity, and visibility.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      locationType: z
        .enum(['us_zip', 'global'])
        .describe('Whether to look up by US zip code or global location name'),
      location: z
        .string()
        .describe('US five-digit zip code or global location name (e.g., "Madrid", "Tokyo")')
    })
  )
  .output(
    z.object({
      weatherData: z
        .record(z.string(), z.any())
        .describe(
          'Current weather information including temperature, conditions, wind, humidity, and visibility'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result: Record<string, any>;

    if (ctx.input.locationType === 'us_zip') {
      result = await client.getWeatherZipCode(ctx.input.location);
    } else {
      result = await client.getGlobalWeather(ctx.input.location);
    }

    return {
      output: {
        weatherData: result
      },
      message: `Retrieved weather for ${ctx.input.locationType === 'us_zip' ? 'zip code' : 'location'} "${ctx.input.location}"`
    };
  })
  .build();
