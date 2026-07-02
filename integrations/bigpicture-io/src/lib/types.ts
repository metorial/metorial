import { z } from 'zod';

export let geoSchema = z.object({
  streetNumber: z.string().nullable().optional().describe('Street number'),
  streetName: z.string().nullable().optional().describe('Street name'),
  subPremise: z.string().nullable().optional().describe('Sub-premise (suite, unit, etc.)'),
  city: z.string().nullable().optional().describe('City name'),
  state: z.string().nullable().optional().describe('State or region name'),
  postalCode: z.string().nullable().optional().describe('Postal or ZIP code'),
  stateCode: z.string().nullable().optional().describe('State abbreviation code'),
  country: z.string().nullable().optional().describe('Country name'),
  countryCode: z.string().nullable().optional().describe('ISO country code')
});

export let metricsSchema = z.object({
  raised: z.number().nullable().optional().describe('Total funding raised in USD'),
  employees: z.number().nullable().optional().describe('Number of employees'),
  marketCap: z.number().nullable().optional().describe('Market capitalization in USD'),
  trancoRank: z.number().nullable().optional().describe('Tranco website ranking'),
  alexaUsRank: z.number().nullable().optional().describe('Alexa US ranking'),
  annualRevenue: z.number().nullable().optional().describe('Annual revenue in USD'),
  employeesRange: z
    .string()
    .nullable()
    .optional()
    .describe('Employee count range (e.g. "1001-5000")'),
  alexaGlobalRank: z.number().nullable().optional().describe('Alexa global ranking'),
  estimatedAnnualRevenue: z
    .string()
    .nullable()
    .optional()
    .describe('Estimated annual revenue range')
});

export let categorySchema = z.object({
  sector: z.string().nullable().optional().describe('Business sector'),
  industryGroup: z.string().nullable().optional().describe('Industry group'),
  industry: z.string().nullable().optional().describe('Industry classification'),
  subIndustry: z.string().nullable().optional().describe('Sub-industry classification'),
  naicsCode: z.string().nullable().optional().describe('NAICS industry code')
});

export let twitterSchema = z.object({
  id: z.string().nullable().optional().describe('Twitter user ID'),
  handle: z.string().nullable().optional().describe('Twitter handle'),
  bio: z.string().nullable().optional().describe('Twitter bio'),
  followers: z.number().nullable().optional().describe('Follower count'),
  following: z.number().nullable().optional().describe('Following count'),
  location: z.string().nullable().optional().describe('Twitter profile location'),
  site: z.string().nullable().optional().describe('Website URL from Twitter profile'),
  avatar: z.string().nullable().optional().describe('Twitter avatar URL')
});

export let companySchema = z.object({
  companyId: z.string().nullable().optional().describe('BigPicture company ID'),
  name: z.string().nullable().optional().describe('Company name'),
  legalName: z.string().nullable().optional().describe('Legal entity name'),
  domain: z.string().nullable().optional().describe('Primary domain'),
  url: z.string().nullable().optional().describe('Company website URL'),
  logo: z.string().nullable().optional().describe('Company logo URL'),
  type: z
    .string()
    .nullable()
    .optional()
    .describe('Company type: public, private, nonprofit, or government'),
  phone: z.string().nullable().optional().describe('Phone number'),
  ticker: z.string().nullable().optional().describe('Stock ticker symbol'),
  tags: z.array(z.string()).nullable().optional().describe('Descriptive tags'),
  tech: z
    .array(z.string())
    .nullable()
    .optional()
    .describe('Technologies detected on the website'),
  aliases: z.array(z.string()).nullable().optional().describe('Known aliases'),
  description: z.string().nullable().optional().describe('Company description'),
  foundedYear: z.number().nullable().optional().describe('Year the company was founded'),
  domainAliases: z
    .array(z.string())
    .nullable()
    .optional()
    .describe('Alternative domain names'),
  emailProvider: z
    .boolean()
    .nullable()
    .optional()
    .describe('Whether the domain is an email provider'),
  location: z.string().nullable().optional().describe('Formatted location string'),
  metrics: metricsSchema.nullable().optional().describe('Business metrics'),
  category: categorySchema.nullable().optional().describe('Industry classification'),
  geo: geoSchema.nullable().optional().describe('Geographic location details'),
  facebook: z
    .object({
      handle: z.string().nullable().optional().describe('Facebook page handle')
    })
    .nullable()
    .optional()
    .describe('Facebook profile'),
  linkedin: z
    .object({
      handle: z.string().nullable().optional().describe('LinkedIn page handle'),
      industry: z.string().nullable().optional().describe('LinkedIn industry')
    })
    .nullable()
    .optional()
    .describe('LinkedIn profile'),
  twitter: twitterSchema.nullable().optional().describe('Twitter profile'),
  crunchbase: z
    .object({
      handle: z.string().nullable().optional().describe('Crunchbase handle')
    })
    .nullable()
    .optional()
    .describe('Crunchbase profile'),
  indexedAt: z
    .string()
    .nullable()
    .optional()
    .describe('When this data was last indexed (ISO 8601)')
});

export let ipGeoSchema = z.object({
  city: z.string().nullable().optional().describe('City name'),
  state: z.string().nullable().optional().describe('State or region name'),
  stateCode: z.string().nullable().optional().describe('State abbreviation code'),
  country: z.string().nullable().optional().describe('Country name'),
  countryCode: z.string().nullable().optional().describe('ISO country code'),
  continent: z.string().nullable().optional().describe('Continent name'),
  continentCode: z.string().nullable().optional().describe('Continent code'),
  isEU: z.boolean().nullable().optional().describe('Whether the location is in the EU')
});

export let whoisSchema = z.object({
  domain: z.string().nullable().optional().describe('WHOIS registered domain'),
  name: z.string().nullable().optional().describe('WHOIS registrant name')
});

export let asnSchema = z.object({
  asn: z.string().nullable().optional().describe('Autonomous System Number'),
  name: z.string().nullable().optional().describe('ASN organization name'),
  route: z.string().nullable().optional().describe('IP route/CIDR block')
});

export let ipCompanyResponseSchema = z.object({
  ip: z.string().describe('The queried IP address'),
  type: z.string().nullable().optional().describe('Result type: business, isp, or hosting'),
  fuzzy: z.boolean().nullable().optional().describe('Whether the match is approximate'),
  confidence: z.number().nullable().optional().describe('Match confidence score (0-1)'),
  geo: ipGeoSchema.nullable().optional().describe('IP geolocation data'),
  company: companySchema.nullable().optional().describe('Matched company profile'),
  whois: whoisSchema.nullable().optional().describe('WHOIS registration data'),
  asn: asnSchema.nullable().optional().describe('Autonomous System Number data')
});

export let webhookPayloadSchema = z.object({
  webhookEventId: z
    .string()
    .nullable()
    .optional()
    .describe('Correlation ID from webhookId parameter'),
  status: z.number().describe('HTTP status code: 200 (success) or 404 (not found)'),
  type: z.string().describe('Resource type (e.g. "company")'),
  body: companySchema.nullable().optional().describe('Full company profile data')
});

export type Company = z.infer<typeof companySchema>;
export type IpCompanyResponse = z.infer<typeof ipCompanyResponseSchema>;
export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;
