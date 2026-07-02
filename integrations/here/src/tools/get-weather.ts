import { SlateTool } from 'slates';
import { z } from 'zod';
import { HereClient } from '../lib/client';
import { spec } from '../spec';

export let getWeather = SlateTool.create(spec, {
  name: 'Get Weather',
  key: 'get_weather',
  description: `Get current weather conditions, forecasts, and severe weather alerts for a specific location. Supports multiple weather products:
- **observation**: Current conditions (temperature, humidity, wind, etc.)
- **forecast7days**: Detailed 7-day forecast
- **forecast7daysSimple**: Simplified 7-day forecast
- **forecastHourly**: Hourly forecast
- **forecastAstronomy**: Sunrise/sunset and moon data
- **alerts**: Severe weather alerts
- **nwsAlerts**: US National Weather Service alerts`,
  instructions: [
    'Provide location as coordinates ("lat,lng"), a place name query, or a US ZIP code.',
    'Request multiple products at once for comprehensive weather data.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      products: z
        .array(
          z.enum([
            'observation',
            'forecast7days',
            'forecast7daysSimple',
            'forecastHourly',
            'forecastAstronomy',
            'alerts',
            'nwsAlerts'
          ])
        )
        .describe('Weather products to retrieve'),
      location: z
        .string()
        .optional()
        .describe('Coordinates as "lat,lng" (e.g. "52.5251,13.3694")'),
      query: z.string().optional().describe('Location name query (e.g. "Berlin, Germany")'),
      zipCode: z.string().optional().describe('US ZIP code'),
      units: z
        .enum(['metric', 'imperial'])
        .optional()
        .describe('Measurement units (default metric)'),
      lang: z.string().optional().describe('Language code (e.g. "en-US")'),
      oneObservation: z
        .boolean()
        .optional()
        .describe('Return only closest weather station observation'),
      hourlyDate: z
        .string()
        .optional()
        .describe('Specific date for hourly forecast (YYYY-MM-DD)')
    })
  )
  .output(
    z.object({
      places: z
        .array(
          z.object({
            observations: z
              .array(
                z.object({
                  time: z.string().optional(),
                  description: z.string().optional(),
                  temperature: z.number().optional().describe('Temperature in selected units'),
                  humidity: z.number().optional().describe('Humidity percentage'),
                  windSpeed: z.number().optional().describe('Wind speed'),
                  windDirection: z.number().optional().describe('Wind direction in degrees'),
                  uvIndex: z.number().optional().describe('UV index'),
                  visibility: z.number().optional().describe('Visibility'),
                  pressure: z.number().optional().describe('Barometric pressure'),
                  iconName: z.string().optional().describe('Weather icon name')
                })
              )
              .optional()
              .describe('Current weather observations'),
            dailyForecasts: z
              .object({
                forecasts: z.array(z.any()).optional()
              })
              .optional()
              .describe('Daily forecast data'),
            hourlyForecasts: z
              .object({
                forecasts: z.array(z.any()).optional()
              })
              .optional()
              .describe('Hourly forecast data'),
            astronomyForecasts: z
              .object({
                forecasts: z.array(z.any()).optional()
              })
              .optional()
              .describe('Astronomy/sun/moon data'),
            alerts: z.array(z.any()).optional().describe('Weather alerts'),
            nwsAlerts: z
              .object({
                warnings: z.array(z.any()).optional(),
                watches: z.array(z.any()).optional()
              })
              .optional()
              .describe('NWS alerts (US only)')
          })
        )
        .optional()
        .describe('Weather data per location')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HereClient({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let response = await client.getWeather({
      products: ctx.input.products,
      location: ctx.input.location,
      query: ctx.input.query,
      zipCode: ctx.input.zipCode,
      units: ctx.input.units,
      lang: ctx.input.lang,
      oneObservation: ctx.input.oneObservation,
      hourlyDate: ctx.input.hourlyDate
    });

    let places = response.places || [];
    let outputPlaces = places.map((place: any) => ({
      observations: place.observations?.map((obs: any) => ({
        time: obs.time,
        description: obs.description,
        temperature: obs.temperature,
        humidity: obs.humidity,
        windSpeed: obs.windSpeed,
        windDirection: obs.windDirection,
        uvIndex: obs.uvIndex,
        visibility: obs.visibility,
        pressure: obs.pressure,
        iconName: obs.iconName
      })),
      dailyForecasts: place.dailyForecasts,
      hourlyForecasts: place.hourlyForecasts,
      astronomyForecasts: place.astronomyForecasts,
      alerts: place.alerts,
      nwsAlerts: place.nwsAlerts
    }));

    let locationLabel =
      ctx.input.query || ctx.input.location || ctx.input.zipCode || 'specified location';
    let obs = outputPlaces[0]?.observations?.[0];
    let tempStr = obs?.temperature !== undefined ? `, **${obs.temperature}°**` : '';

    return {
      output: { places: outputPlaces },
      message: `Retrieved weather for **${locationLabel}** (${ctx.input.products.join(', ')})${tempStr}.`
    };
  })
  .build();
