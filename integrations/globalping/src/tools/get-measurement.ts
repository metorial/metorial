import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMeasurement = SlateTool.create(spec, {
  name: 'Get Measurement',
  key: 'get_measurement',
  description: `Retrieve the status and results of a previously created network measurement by its ID. Use this to check on measurements created with "Run Measurement" when \`waitForResults\` was set to false, or to re-fetch results of any measurement within its availability window.`,
  constraints: [
    'Measurement results are typically available for six months after creation.',
    'Rate limited to 2 requests/second per measurement.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      measurementId: z.string().describe('The ID of the measurement to retrieve')
    })
  )
  .output(
    z.object({
      measurementId: z.string().describe('Measurement identifier'),
      type: z.string().describe('Measurement type (ping, traceroute, dns, mtr, http)'),
      target: z.string().describe('Measurement target'),
      status: z.string().describe('Measurement status: "in-progress" or "finished"'),
      probesCount: z.number().describe('Number of probes that executed the test'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
      updatedAt: z.string().optional().describe('ISO 8601 last update timestamp'),
      results: z
        .array(
          z.object({
            probe: z
              .object({
                continent: z.string(),
                region: z.string(),
                country: z.string(),
                state: z.string().nullable().optional(),
                city: z.string(),
                asn: z.number(),
                network: z.string(),
                latitude: z.number().optional(),
                longitude: z.number().optional(),
                tags: z.array(z.string()).optional(),
                resolvers: z.array(z.string()).optional()
              })
              .describe('Probe information'),
            result: z.record(z.string(), z.unknown()).describe('Test result data')
          })
        )
        .describe('Results from each probe')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getMeasurement(ctx.input.measurementId);

    let results = data.results;

    return {
      output: {
        measurementId: data.id,
        type: data.type,
        target: data.target,
        status: data.status,
        probesCount: data.probesCount,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        results
      },
      message: `Measurement **${data.id}** (${data.type} to ${data.target}) — status: **${data.status}** with ${results.length} probe result(s).`
    };
  })
  .build();
