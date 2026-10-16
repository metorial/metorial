import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let dataPointSchema = z.record(z.string(), z.any()).describe('TMY time-series data point');

export let getTmyData = SlateTool.create(spec, {
  name: 'Get TMY Data',
  key: 'get_tmy_data',
  description: `Retrieve Typical Meteorological Year (TMY) datasets for long-term resource assessment and energy yield modeling. TMY data is generated from 15+ years of satellite-derived historical data.

Available for three data types:
- **Radiation & Weather**: TMY irradiance and weather data for a location
- **Rooftop PV Power**: TMY PV power output for a rooftop system
- **Advanced PV Power**: TMY PV power for a pre-configured PV Power Site

Useful for solar resource assessment, bankable energy yield studies, and long-term performance projections.`,
  instructions: [
    'Choose the dataType that matches your use case.',
    'For rooftopPvPower, provide capacity, tilt, and azimuth.',
    'For advancedPvPower, provide a resourceId of an existing PV Power Site.',
    'Adjust ghiWeight and dniWeight to control how the TMY months are selected.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dataType: z
        .enum(['radiationAndWeather', 'rooftopPvPower', 'advancedPvPower'])
        .describe('Type of TMY data to retrieve'),
      latitude: z
        .number()
        .min(-90)
        .max(90)
        .optional()
        .describe('Latitude (required for radiationAndWeather and rooftopPvPower)'),
      longitude: z
        .number()
        .min(-180)
        .max(180)
        .optional()
        .describe('Longitude (required for radiationAndWeather and rooftopPvPower)'),
      resourceId: z
        .string()
        .optional()
        .describe(
          'PV Power Site resource ID, discoverable with list_pv_power_sites (required for advancedPvPower)'
        ),
      capacity: z
        .number()
        .positive()
        .optional()
        .describe('System capacity in kW (required for rooftopPvPower)'),
      tilt: z.number().min(0).max(90).optional().describe('Panel tilt angle'),
      azimuth: z.number().min(-180).max(180).optional().describe('Panel azimuth angle'),
      installDate: z.string().optional().describe('Installation date for rooftop PV'),
      lossFactor: z.number().min(0).max(1).optional().describe('Loss factor for rooftop PV'),
      arrayType: z
        .enum(['fixed', 'horizontal_single_axis'])
        .optional()
        .describe('Array type for radiation and weather'),
      outputParameters: z
        .array(z.string())
        .optional()
        .describe('Specific output parameters to include'),
      period: z
        .enum(['PT5M', 'PT10M', 'PT15M', 'PT20M', 'PT30M', 'PT60M'])
        .optional()
        .describe('Time resolution'),
      timeZone: z.string().optional().describe('Time zone for timestamps'),
      ghiWeight: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Weight given to GHI when selecting TMY months (0 to 1)'),
      dniWeight: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Weight given to DNI when selecting TMY months (0 to 1)'),
      probability: z
        .enum(['P10', 'P50', 'P75', 'P90', 'P95'])
        .optional()
        .describe(
          'TMY probability: P50, P75, P90, or P95. Legacy P10 is retained but not supported by the current API'
        ),
      terrainShading: z.boolean().optional().describe('Apply terrain shading'),
      availabilityPercent: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe(
          'Availability override as a percentage of AC capacity (0 to 100); takes precedence over applyAvailability'
        ),
      constraintPowerMw: z
        .number()
        .min(0)
        .optional()
        .describe('Optional AC power cap in MW; configured site export limits still apply'),
      dustSoilingLoss: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe(
          'Dust soiling loss fraction (0 to 1); takes precedence over applyDustSoiling'
        ),
      snowSoilingLoss: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe(
          'Snow soiling loss fraction (0 to 1); takes precedence over applySnowSoiling'
        ),
      applyAvailability: z
        .boolean()
        .optional()
        .describe(
          'Advanced PV only: true uses defaults; false requests 100% availability unless availabilityPercent is provided'
        ),
      applyConstraint: z
        .boolean()
        .optional()
        .describe(
          'Legacy flag; use constraintPowerMw for an explicit cap. Configured site limits remain active'
        ),
      applyDustSoiling: z
        .boolean()
        .optional()
        .describe(
          'Advanced PV only: true uses default dust soiling; false requests zero dust loss unless dustSoilingLoss is provided'
        ),
      applySnowSoiling: z
        .boolean()
        .optional()
        .describe(
          'Advanced PV only: true uses default snow soiling; false requests zero snow loss unless snowSoilingLoss is provided'
        ),
      applyTrackerInactive: z
        .boolean()
        .optional()
        .describe('Apply inactive trackers (advancedPvPower only)')
    })
  )
  .output(
    z.object({
      dataPoints: z.array(dataPointSchema).describe('Array of TMY time-series data points'),
      count: z.number().describe('Number of data points returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;
    let result: any;
    if (input.period && ['PT5M', 'PT10M'].includes(input.period)) {
      throw createApiServiceError('TMY supports PT15M, PT20M, PT30M, and PT60M periods.');
    }
    if (
      input.ghiWeight !== undefined &&
      input.dniWeight !== undefined &&
      Math.abs(input.ghiWeight + input.dniWeight - 1) > 1e-9
    ) {
      throw createApiServiceError('ghiWeight and dniWeight must sum to 1.');
    }

    if (input.dataType === 'radiationAndWeather') {
      if (input.latitude === undefined || input.longitude === undefined) {
        throw createApiServiceError(
          'latitude and longitude are required for radiationAndWeather TMY data.'
        );
      }
      result = await client.getTmyRadiationAndWeather({
        latitude: input.latitude,
        longitude: input.longitude,
        outputParameters: input.outputParameters,
        period: input.period,
        timeZone: input.timeZone,
        ghiWeight:
          input.ghiWeight ?? (input.dniWeight === undefined ? undefined : 1 - input.dniWeight),
        dniWeight:
          input.dniWeight ?? (input.ghiWeight === undefined ? undefined : 1 - input.ghiWeight),
        probability: input.probability,
        tilt: input.tilt,
        azimuth: input.azimuth,
        arrayType: input.arrayType,
        terrainShading: input.terrainShading
      });
    } else if (input.dataType === 'rooftopPvPower') {
      if (
        input.latitude === undefined ||
        input.longitude === undefined ||
        input.capacity === undefined
      ) {
        throw createApiServiceError(
          'latitude, longitude, and capacity are required for rooftopPvPower TMY data.'
        );
      }
      result = await client.getTmyRooftopPvPower({
        latitude: input.latitude,
        longitude: input.longitude,
        capacity: input.capacity,
        tilt: input.tilt,
        azimuth: input.azimuth,
        installDate: input.installDate,
        lossFactor: input.lossFactor,
        outputParameters: input.outputParameters,
        period: input.period,
        timeZone: input.timeZone,
        ghiWeight:
          input.ghiWeight ?? (input.dniWeight === undefined ? undefined : 1 - input.dniWeight),
        dniWeight:
          input.dniWeight ?? (input.ghiWeight === undefined ? undefined : 1 - input.ghiWeight),
        probability: input.probability,
        terrainShading: input.terrainShading,
        snowSoilingLoss: input.snowSoilingLoss
      });
    } else {
      if (!input.resourceId) {
        throw createApiServiceError('resourceId is required for advancedPvPower TMY data.');
      }
      result = await client.getTmyAdvancedPvPower({
        resourceId: input.resourceId,
        outputParameters: input.outputParameters,
        period: input.period,
        timeZone: input.timeZone,
        ghiWeight:
          input.ghiWeight ?? (input.dniWeight === undefined ? undefined : 1 - input.dniWeight),
        dniWeight:
          input.dniWeight ?? (input.ghiWeight === undefined ? undefined : 1 - input.ghiWeight),
        probability: input.probability,
        availabilityPercent: input.availabilityPercent,
        constraintPowerMw: input.constraintPowerMw,
        dustSoilingLoss: input.dustSoilingLoss,
        snowSoilingLoss: input.snowSoilingLoss,
        applyAvailability: input.applyAvailability,
        applyConstraint: input.applyConstraint,
        applyDustSoiling: input.applyDustSoiling,
        applySnowSoiling: input.applySnowSoiling,
        applyTrackerInactive: input.applyTrackerInactive,
        terrainShading: input.terrainShading
      });
    }

    let dataPoints = result.estimated_actuals ?? result.forecasts ?? result.tmy ?? [];
    if (!Array.isArray(dataPoints)) {
      // TMY responses may wrap data differently
      dataPoints = Object.values(result).find((v: unknown) => Array.isArray(v)) ?? [];
    }

    return {
      output: {
        dataPoints: dataPoints as Record<string, any>[],
        count: (dataPoints as any[]).length
      },
      message: `Retrieved **${(dataPoints as any[]).length}** TMY data points (${input.dataType}).`
    };
  })
  .build();
