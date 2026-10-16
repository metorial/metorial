import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { NasaClient, validateInteger } from '../lib/client';
import { spec } from '../spec';

export let lookupSmallBody = SlateTool.create(spec, {
  name: 'Lookup Small Body',
  key: 'lookup_small_body',
  description: `Look up asteroid or comet data from JPL's Small-Body Database (SBDB). Returns orbital elements, physical characteristics, and discovery circumstances for a specific small body. Search by designation, SPK-ID, or name.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      designation: z
        .string()
        .optional()
        .describe('IAU designation (e.g., "433" for Eros, "1P" for Halley\'s Comet)'),
      spkId: z.number().optional().describe('JPL SPK-ID number'),
      searchName: z
        .string()
        .optional()
        .describe('Search string matching against names (e.g., "eros", "halley")')
    })
  )
  .output(
    z.object({
      raw: z.any().optional().describe('Complete provider response'),
      physicalParameters: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe(
          'Complete physical parameter records with provider names, values, units and references'
        ),
      discovery: z
        .record(z.string(), z.any())
        .optional()
        .describe('Discovery circumstances and citations'),
      object: z
        .record(z.string(), z.any())
        .optional()
        .describe('Object identification information'),
      orbit: z
        .record(z.string(), z.any())
        .optional()
        .describe('Orbital elements and parameters'),
      physical: z.record(z.string(), z.any()).optional().describe('Physical characteristics')
    })
  )
  .handleInvocation(async ctx => {
    if (
      [ctx.input.designation, ctx.input.spkId, ctx.input.searchName].filter(
        value => value !== undefined
      ).length !== 1
    ) {
      throw createApiServiceError('Provide exactly one of designation, spkId, or searchName.');
    }
    validateInteger(ctx.input.spkId, 'SPK-ID', 1);
    let client = new NasaClient({ token: ctx.auth.token });

    let result = await client.getSsdSmallBody({
      designation: ctx.input.designation,
      spkId: ctx.input.spkId,
      searchName: ctx.input.searchName
    });

    let objectInfo = result.object;
    let orbit = result.orbit;
    let physicalParameters = result.phys_par;
    let physical = Array.isArray(physicalParameters)
      ? Object.fromEntries(
          physicalParameters.map((parameter: any) => [parameter.name, parameter])
        )
      : physicalParameters;

    return {
      output: {
        raw: result,
        physicalParameters,
        discovery: result.discovery,
        object: objectInfo,
        orbit,
        physical
      },
      message: `Found small body: **${objectInfo?.fullname || objectInfo?.des || ctx.input.searchName || 'Unknown'}**.`
    };
  })
  .build();
