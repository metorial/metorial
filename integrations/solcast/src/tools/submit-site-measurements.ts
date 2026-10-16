import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let submitSiteMeasurements = SlateTool.create(spec, {
  name: 'Submit Site Measurements',
  key: 'submit_site_measurements',
  description:
    'Submit up to 1000 measured power and operating-condition records for an Advanced PV Power site. Discover the resource ID with list_pv_power_sites. Power values use MW.',
  instructions: [
    'Each record needs an ISO 8601 periodEnd with a timezone and an ISO 8601 period duration.',
    'Use this operation for Advanced PV Power sites. Premium PV measurement submission uses a different API.'
  ],
  tags: { readOnly: false }
})
  .input(
    z.object({
      resourceId: z
        .string()
        .min(1)
        .describe('Advanced PV Power resource ID from list_pv_power_sites'),
      measurements: z
        .array(
          z.object({
            periodEnd: z
              .string()
              .describe('Exclusive end of the measurement period, including a timezone'),
            period: z.string().describe('ISO 8601 period duration, for example PT5M'),
            totalPower: z.number().optional().describe('Measured power output in MW'),
            availability: z
              .number()
              .min(0)
              .max(100)
              .optional()
              .describe('Available AC capacity as a percentage'),
            meanGhi: z
              .number()
              .int()
              .optional()
              .describe('Mean global horizontal irradiance in W/m²'),
            trackingAngle: z
              .number()
              .int()
              .optional()
              .describe('Applied tracking angle in degrees'),
            networkConstraint: z
              .boolean()
              .optional()
              .describe('Whether a network constraint affected this period'),
            constraintPowerCeiling: z
              .number()
              .optional()
              .describe('Network constraint power ceiling in MW'),
            localLimit: z.number().optional().describe('Local power limit in MW'),
            frequency: z.number().optional().describe('Grid frequency in Hz')
          })
        )
        .min(1)
        .max(1000)
        .describe('Measurement records to submit')
    })
  )
  .output(
    z.object({
      resourceId: z.string().describe('Advanced PV Power resource ID'),
      submittedCount: z.number().describe('Number of records submitted successfully'),
      result: z
        .record(z.string(), z.any())
        .describe('Complete provider response, including accepted measurements')
    })
  )
  .handleInvocation(async ctx => {
    for (let measurement of ctx.input.measurements) {
      if (
        !Number.isFinite(Date.parse(measurement.periodEnd)) ||
        !/(?:Z|[+-]\d{2}:\d{2})$/i.test(measurement.periodEnd)
      ) {
        throw createApiServiceError(
          'Each periodEnd must be an ISO 8601 datetime with a timezone.'
        );
      }
      if (
        !/^P(?=.+)(?:\d+(?:\.\d+)?D)?(?:T(?=.+)(?:\d+(?:\.\d+)?H)?(?:\d+(?:\.\d+)?M)?(?:\d+(?:\.\d+)?S)?)?$/.test(
          measurement.period
        ) ||
        !/[1-9]/.test(measurement.period)
      ) {
        throw createApiServiceError(
          'Each period must be a positive ISO 8601 duration, such as PT5M.'
        );
      }
    }
    let client = new Client({ token: ctx.auth.token });
    let result = await client.submitSiteMeasurements(
      ctx.input.resourceId,
      ctx.input.measurements
    );
    return {
      output: {
        resourceId: ctx.input.resourceId,
        submittedCount: ctx.input.measurements.length,
        result
      },
      message: `Submitted **${ctx.input.measurements.length}** measurements for site \`${ctx.input.resourceId}\`.`
    };
  })
  .build();
