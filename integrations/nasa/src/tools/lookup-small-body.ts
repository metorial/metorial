import { SlateTool } from 'slates';
import { z } from 'zod';
import { NasaClient } from '../lib/client';
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
    let client = new NasaClient({ token: ctx.auth.token });

    let result = await client.getSsdSmallBody({
      designation: ctx.input.designation,
      spkId: ctx.input.spkId,
      searchName: ctx.input.searchName
    });

    let objectInfo = result.object || {};
    let orbit = result.orbit || {};
    let physical = result.phys_par || {};

    return {
      output: {
        object: objectInfo,
        orbit,
        physical
      },
      message: `Found small body: **${objectInfo.fullname || objectInfo.des || ctx.input.searchName || 'Unknown'}**.`
    };
  })
  .build();
