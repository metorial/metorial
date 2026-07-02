import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let locationSchema = z
  .object({
    magic: z
      .string()
      .optional()
      .describe(
        'Flexible location filter. Accepts countries, continents, cities, US states, regions, ASNs, ISP names, tags, or cloud region names (e.g. "us-east-2"). Use "+" to combine filters (e.g. "US+AWS").'
      ),
    continent: z
      .enum(['AF', 'AN', 'AS', 'EU', 'NA', 'OC', 'SA'])
      .optional()
      .describe('Continent code'),
    country: z
      .string()
      .optional()
      .describe('ISO 3166-1 alpha-2 country code (e.g. "US", "DE")'),
    state: z.string().optional().describe('US state code with US- prefix (e.g. "US-CA")'),
    city: z.string().optional().describe('City name in English'),
    asn: z.number().optional().describe('Autonomous System Number'),
    network: z.string().optional().describe('Network/ISP name (e.g. "Google LLC")'),
    tags: z
      .array(z.string())
      .optional()
      .describe(
        'Tags such as cloud region codes (e.g. "aws-eu-west-1") or network types ("datacenter-network", "eyeball-network")'
      ),
    limit: z
      .number()
      .min(1)
      .max(200)
      .optional()
      .describe('Max number of probes from this location (1-200, default: 1)')
  })
  .describe('Location filter for probe selection');

let pingOptionsSchema = z
  .object({
    packets: z
      .number()
      .min(1)
      .max(16)
      .optional()
      .describe('Number of packets to send (1-16, default: 3)'),
    protocol: z.enum(['ICMP', 'TCP']).optional().describe('Ping protocol (default: ICMP)'),
    port: z.number().min(0).max(65535).optional().describe('Port for TCP ping (default: 80)'),
    ipVersion: z.number().optional().describe('IP version: 4 or 6 (default: 4, experimental)')
  })
  .optional()
  .describe('Ping-specific measurement options');

let tracerouteOptionsSchema = z
  .object({
    protocol: z
      .enum(['ICMP', 'TCP', 'UDP'])
      .optional()
      .describe('Traceroute protocol (default: ICMP)'),
    port: z.number().min(0).max(65535).optional().describe('Destination port (default: 80)'),
    ipVersion: z.number().optional().describe('IP version: 4 or 6 (default: 4)')
  })
  .optional()
  .describe('Traceroute-specific measurement options');

let dnsOptionsSchema = z
  .object({
    query: z
      .object({
        type: z
          .enum([
            'A',
            'AAAA',
            'ANY',
            'CNAME',
            'DNSKEY',
            'DS',
            'HTTPS',
            'MX',
            'NS',
            'NSEC',
            'PTR',
            'RRSIG',
            'SOA',
            'TXT',
            'SRV',
            'SVCB'
          ])
          .optional()
          .describe('DNS record type (default: A)')
      })
      .optional()
      .describe('DNS query configuration'),
    resolver: z.string().optional().describe('DNS resolver address (IPv4, IPv6, or hostname)'),
    protocol: z
      .enum(['TCP', 'UDP'])
      .optional()
      .describe('DNS transport protocol (default: UDP)'),
    port: z.number().min(0).max(65535).optional().describe('DNS server port (default: 53)'),
    trace: z
      .boolean()
      .optional()
      .describe('Enable DNS delegation path tracing (default: false)'),
    ipVersion: z.number().optional().describe('IP version: 4 or 6 (default: 4)')
  })
  .optional()
  .describe('DNS-specific measurement options');

let mtrOptionsSchema = z
  .object({
    packets: z
      .number()
      .min(1)
      .max(16)
      .optional()
      .describe('Number of packets per hop (1-16, default: 3)'),
    protocol: z
      .enum(['ICMP', 'TCP', 'UDP'])
      .optional()
      .describe('MTR protocol (default: ICMP)'),
    port: z.number().min(0).max(65535).optional().describe('Port for TCP/UDP (default: 80)'),
    ipVersion: z.number().optional().describe('IP version: 4 or 6 (default: 4)')
  })
  .optional()
  .describe('MTR-specific measurement options');

let httpOptionsSchema = z
  .object({
    request: z
      .object({
        method: z
          .enum(['HEAD', 'GET', 'OPTIONS'])
          .optional()
          .describe('HTTP method (default: HEAD)'),
        path: z.string().optional().describe('URL path'),
        query: z.string().optional().describe('URL query string'),
        host: z.string().optional().describe('Host header override'),
        headers: z
          .record(z.string(), z.string())
          .optional()
          .describe('Additional HTTP headers')
      })
      .optional()
      .describe('HTTP request configuration'),
    resolver: z.string().optional().describe('DNS resolver for the HTTP request'),
    protocol: z
      .enum(['HTTP', 'HTTPS', 'HTTP2'])
      .optional()
      .describe('HTTP protocol (default: HTTPS)'),
    port: z.number().min(0).max(65535).optional().describe('Port number (default: 80)'),
    ipVersion: z.number().optional().describe('IP version: 4 or 6 (default: 4)')
  })
  .optional()
  .describe('HTTP-specific measurement options');

let _probeLocationSchema = z
  .object({
    continent: z.string().describe('Continent code'),
    region: z.string().describe('Geographic region'),
    country: z.string().describe('ISO 3166-1 alpha-2 country code'),
    state: z.string().nullable().optional().describe('US state code'),
    city: z.string().describe('City name'),
    asn: z.number().describe('Autonomous System Number'),
    network: z.string().describe('Network/ISP name'),
    latitude: z.number().describe('Latitude'),
    longitude: z.number().describe('Longitude')
  })
  .describe('Probe location details');

let probeResultSchema = z
  .object({
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
    result: z
      .record(z.string(), z.unknown())
      .describe(
        'Test result data including rawOutput, stats, timings, hops, answers, headers, etc. depending on measurement type'
      )
  })
  .describe('Result from a single probe');

export let runMeasurement = SlateTool.create(spec, {
  name: 'Run Measurement',
  key: 'run_measurement',
  description: `Create and run a network diagnostic test from globally distributed probes, then poll for and return the completed results. Supports **ping**, **traceroute**, **dns**, **mtr**, and **http** measurement types.

Use location filters to target specific geographic regions, networks, or cloud providers. The tool automatically waits for the measurement to complete before returning results.`,
  instructions: [
    'Use the "magic" location field for simple, flexible probe targeting (e.g. "Germany", "AWS", "us-east-2").',
    'Use structured location fields (country, city, asn, etc.) when you need precise control.',
    'For HTTP measurements, the target should be a domain name or IP address. Use measurementOptions to configure path, method, and headers.',
    'Set waitForResults to false if you only want to create the measurement without waiting for completion.'
  ],
  constraints: [
    'Only public endpoints can be targeted; no local/private network tests.',
    'Unauthenticated: max 250 tests/hour, 50 probes per measurement. Authenticated: 500 tests/hour, 500 probes.',
    'The actual number of probes may be fewer than requested.',
    'HTTP response body is limited to the first 10 KB.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      type: z
        .enum(['ping', 'traceroute', 'dns', 'mtr', 'http'])
        .describe('Type of network measurement to run'),
      target: z.string().describe('Domain name, IPv4, or IPv6 address to test'),
      locations: z
        .array(locationSchema)
        .optional()
        .describe(
          'Probe location filters. If omitted, a single probe is selected automatically.'
        ),
      limit: z
        .number()
        .min(1)
        .max(500)
        .optional()
        .describe('Global max number of probes (1-500, default: 1)'),
      pingOptions: pingOptionsSchema,
      tracerouteOptions: tracerouteOptionsSchema,
      dnsOptions: dnsOptionsSchema,
      mtrOptions: mtrOptionsSchema,
      httpOptions: httpOptionsSchema,
      waitForResults: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          'Whether to poll and wait for results (default: true). Set to false to only create the measurement.'
        )
    })
  )
  .output(
    z.object({
      measurementId: z.string().describe('Unique measurement identifier'),
      type: z.string().optional().describe('Measurement type'),
      target: z.string().optional().describe('Measurement target'),
      status: z.string().describe('Measurement status: "in-progress" or "finished"'),
      probesCount: z.number().describe('Number of probes that executed the test'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
      results: z
        .array(probeResultSchema)
        .optional()
        .describe('Results from each probe (included when waitForResults is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let measurementOptions: Record<string, unknown> = {};

    if (ctx.input.type === 'ping' && ctx.input.pingOptions) {
      Object.assign(measurementOptions, ctx.input.pingOptions);
    } else if (ctx.input.type === 'traceroute' && ctx.input.tracerouteOptions) {
      Object.assign(measurementOptions, ctx.input.tracerouteOptions);
    } else if (ctx.input.type === 'dns' && ctx.input.dnsOptions) {
      Object.assign(measurementOptions, ctx.input.dnsOptions);
    } else if (ctx.input.type === 'mtr' && ctx.input.mtrOptions) {
      Object.assign(measurementOptions, ctx.input.mtrOptions);
    } else if (ctx.input.type === 'http' && ctx.input.httpOptions) {
      Object.assign(measurementOptions, ctx.input.httpOptions);
    }

    let body: Record<string, unknown> = {
      type: ctx.input.type,
      target: ctx.input.target
    };

    if (ctx.input.locations && ctx.input.locations.length > 0) {
      body.locations = ctx.input.locations;
    }

    if (ctx.input.limit !== undefined) {
      body.limit = ctx.input.limit;
    }

    if (Object.keys(measurementOptions).length > 0) {
      body.measurementOptions = measurementOptions;
    }

    ctx.info({
      message: 'Creating measurement',
      type: ctx.input.type,
      target: ctx.input.target
    });

    let { measurementId, probesCount } = await client.createMeasurement(
      body as {
        type: string;
        target: string;
        locations?: Record<string, unknown>[];
        limit?: number;
        measurementOptions?: Record<string, unknown>;
      }
    );

    if (!ctx.input.waitForResults) {
      return {
        output: {
          measurementId,
          status: 'in-progress',
          probesCount
        },
        message: `Measurement **${measurementId}** created (${ctx.input.type} to ${ctx.input.target}) with ${probesCount} probe(s). Results are not yet available — use "Get Measurement" to retrieve them.`
      };
    }

    ctx.progress('Waiting for measurement to complete...');

    let result = await client.pollMeasurement(measurementId);

    let results = (result.results as Record<string, unknown>[] | undefined) ?? [];

    return {
      output: {
        measurementId,
        type: result.type as string,
        target: result.target as string,
        status: result.status as string,
        probesCount: results.length,
        createdAt: result.createdAt as string | undefined,
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
      message: `**${ctx.input.type}** measurement to **${ctx.input.target}** completed with status **${result.status}**. ${results.length} probe(s) returned results.`
    };
  })
  .build();
