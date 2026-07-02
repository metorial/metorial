import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let confidenceAreaPointSchema = z
  .object({
    latitude: z.number().describe('Latitude of the confidence area boundary point'),
    longitude: z.number().describe('Longitude of the confidence area boundary point')
  })
  .passthrough();

let countrySchema = z
  .object({
    isoAlpha2: z.string().describe('ISO 3166-1 Alpha-2 country code'),
    isoAlpha3: z.string().describe('ISO 3166-1 Alpha-3 country code'),
    m49Code: z.number().optional().describe('United Nations M.49 code'),
    name: z.string().describe('Localised country name'),
    isoName: z.string().optional().describe('ISO 3166-1 country name short'),
    isoNameFull: z.string().optional().describe('ISO 3166-1 country name full')
  })
  .passthrough();

let locationSchema = z
  .object({
    continent: z.string().optional().describe('Continent name'),
    continentCode: z.string().optional().describe('Continent code'),
    isoPrincipalSubdivision: z.string().optional().describe('Principal subdivision name'),
    isoPrincipalSubdivisionCode: z
      .string()
      .optional()
      .describe('Principal subdivision ISO code'),
    city: z.string().optional().describe('City name'),
    postcode: z.string().optional().describe('Postal code'),
    latitude: z.number().optional().describe('Estimated latitude'),
    longitude: z.number().optional().describe('Estimated longitude')
  })
  .passthrough();

export let geolocateIpTool = SlateTool.create(spec, {
  name: 'Geolocate IP',
  key: 'geolocate_ip',
  description: `Determine the geographic location of an IP address (IPv4 or IPv6) with high precision. Returns country, region, city, coordinates, timezone, ISP/ASN details, confidence level, confidence area polygon, and a full hazard report including VPN/proxy/Tor detection.
If no IP is provided, the caller's own IP is geolocated.`,
  instructions: [
    "Omit the IP address to geolocate the caller's own IP.",
    'Confidence levels are "low", "moderate", or "high".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ip: z
        .string()
        .optional()
        .describe("IPv4 or IPv6 address to geolocate. If omitted, the caller's IP is used.")
    })
  )
  .output(
    z
      .object({
        ip: z.string().describe('The IP address that was geolocated'),
        isReachableGlobally: z
          .boolean()
          .optional()
          .describe('Whether the IP is present on the global routing table'),
        country: countrySchema.optional().describe('Country-level location details'),
        location: locationSchema.optional().describe('Detailed geographic location'),
        confidence: z
          .string()
          .optional()
          .describe('Geolocation confidence: low, moderate, or high'),
        confidenceArea: z
          .array(confidenceAreaPointSchema)
          .optional()
          .describe('Polygonal confidence area boundary points'),
        network: z
          .object({
            carriers: z
              .array(
                z
                  .object({
                    asn: z.string().optional().describe('Autonomous System Number'),
                    organisation: z.string().optional().describe('Organisation name')
                  })
                  .passthrough()
              )
              .optional()
              .describe('Network carriers / ISPs')
          })
          .passthrough()
          .optional()
          .describe('Network/ASN information'),
        hazardReport: z
          .object({
            isKnownAsTorServer: z.boolean().optional(),
            isKnownAsVpn: z.boolean().optional(),
            isKnownAsProxy: z.boolean().optional(),
            isSpamhausDrop: z.boolean().optional(),
            isSpamhausEdrop: z.boolean().optional(),
            isSpamhausAsnDrop: z.boolean().optional(),
            isBlacklistedUceprotect: z.boolean().optional(),
            isBlacklistedBlocklistDe: z.boolean().optional(),
            isKnownAsMailServer: z.boolean().optional(),
            isKnownAsPublicRouter: z.boolean().optional(),
            isBogon: z.boolean().optional(),
            isUnreachable: z.boolean().optional(),
            hostingLikelihood: z.number().optional().describe('Hosting likelihood score 0-10'),
            isHostingAsn: z.boolean().optional(),
            isCellular: z.boolean().optional(),
            iCloudPrivateRelay: z.boolean().optional()
          })
          .passthrough()
          .optional()
          .describe('Security hazard assessment for the IP'),
        securityThreat: z
          .string()
          .optional()
          .describe('Overall security threat classification'),
        localityLanguageRequested: z.string().optional()
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      localityLanguage: ctx.config.localityLanguage
    });

    let result = await client.ipGeolocation({ ip: ctx.input.ip });

    let ipAddr = result.ip || ctx.input.ip || 'caller IP';
    let city = result.location?.city || result.city || '';
    let countryName = result.country?.name || '';
    let confidence = result.confidence || 'unknown';
    let threat = result.securityThreat || 'unknown';

    let locationParts = [city, countryName].filter(Boolean).join(', ');
    let summary = `**${ipAddr}** geolocated to ${locationParts || 'unknown location'} (confidence: ${confidence}, threat: ${threat}).`;

    return {
      output: result,
      message: summary
    };
  })
  .build();
