import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMeasurement = SlateTool.create(spec, {
  name: 'Get Measurement',
  key: 'get_measurement',
  description: `Retrieve the status and results of a previously created network measurement by its ID. Use this to check on measurements created with "Run Measurement" when \`waitForResults\` was set to false, or to re-fetch results of any measurement within its availability window.`,
  constraints: [
    'Measurement results are typically available for 7 days after creation.',
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

    let results = (data.results as Record<string, unknown>[] | undefined) ?? [];

    return {
      output: {
        measurementId: data.id as string,
        type: data.type as string,
        target: data.target as string,
        status: data.status as string,
        probesCount: results.length,
        createdAt: data.createdAt as string | undefined,
        results: results as Array<{
          probe: {
            continent: string;
            region: string;
            country: string;
            state?: string | null;
            city: string;
            asn: number;
            network: string;
            tags?: string[];
            resolvers?: string[];
          };
          result: Record<string, unknown>;
        }>
      },
      message: `Measurement **${data.id}** (${data.type} to ${data.target}) — status: **${data.status}** with ${results.length} probe result(s).`
    };
  })
  .build();
