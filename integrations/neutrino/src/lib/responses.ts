import { z } from 'zod';

// Types from https://www.neutrinoapi.com/api/openapi-3.1.json (3.7.2).
// Existing summaries validate only fields they consume; raw retains the complete response.

export const emailValidateResponse = z.object({
  valid: z.boolean(),
  syntaxError: z.boolean(),
  domain: z.string(),
  domainError: z.boolean(),
  isFreemail: z.boolean(),
  email: z.string(),
  isDisposable: z.boolean(),
  typosFixed: z.boolean(),
  isPersonal: z.boolean(),
  provider: z.string(),
  domainStatus: z.string()
});

export const emailVerifyResponse = z.object({
  valid: z.boolean(),
  verified: z.boolean(),
  email: z.string(),
  domain: z.string(),
  provider: z.string(),
  isFreemail: z.boolean(),
  isDisposable: z.boolean(),
  isPersonal: z.boolean(),
  smtpStatus: z.string(),
  smtpResponse: z.string(),
  isCatchAll: z.boolean()
});

export const phoneValidateResponse = z.object({
  valid: z.boolean(),
  internationalCallingCode: z.string(),
  countryCode: z.string(),
  location: z.string(),
  isMobile: z.boolean(),
  type: z.string(),
  internationalNumber: z.string(),
  localNumber: z.string(),
  country: z.string(),
  countryCode3: z.string(),
  currencyCode: z.string(),
  prefixNetwork: z.string()
});

export const ipInfoResponse = z.object({
  valid: z.boolean(),
  country: z.string(),
  hostname: z.string(),
  city: z.string(),
  countryCode: z.string(),
  latitude: z.number(),
  region: z.string(),
  longitude: z.number(),
  continentCode: z.string(),
  ip: z.string(),
  currencyCode: z.string(),
  hostDomain: z.string(),
  timezone: z.object({
    id: z.string(),
    name: z.string(),
    abbr: z.string(),
    date: z.string(),
    time: z.string(),
    offset: z.string()
  }),
  isV6: z.boolean(),
  isBogon: z.boolean(),
  regionCode: z.string()
});

export const ipBlocklistResponse = z.object({
  ip: z.string(),
  isBot: z.boolean(),
  isExploitBot: z.boolean(),
  isMalware: z.boolean(),
  isSpider: z.boolean(),
  isDshield: z.boolean(),
  listCount: z.number(),
  isProxy: z.boolean(),
  isHijacked: z.boolean(),
  isTor: z.boolean(),
  isSpyware: z.boolean(),
  isSpamBot: z.boolean(),
  isListed: z.boolean(),
  isVpn: z.boolean(),
  lastSeen: z.number(),
  blocklists: z.array(z.string())
});

export const ipProbeResponse = z.object({
  valid: z.boolean(),
  country: z.string(),
  providerType: z.string(),
  countryCode: z.string(),
  providerDomain: z.string(),
  city: z.string(),
  ip: z.string(),
  region: z.string(),
  providerDescription: z.string(),
  isHosting: z.boolean(),
  isIsp: z.boolean(),
  isVpn: z.boolean(),
  isProxy: z.boolean(),
  asn: z.string(),
  asCidr: z.string(),
  asCountryCode: z.string(),
  asDomains: z.array(z.string())
});

export const hostReputationResponse = z.object({
  isListed: z.boolean(),
  lists: z.array(
    z.object({
      isListed: z.boolean(),
      listHost: z.string(),
      listRating: z.number(),
      listName: z.string(),
      txtRecord: z.string(),
      returnCode: z.string(),
      responseTime: z.number()
    })
  ),
  listCount: z.number(),
  host: z.string()
});

export const geocodeAddressResponse = z.object({
  found: z.number(),
  locations: z.array(
    z.object({
      country: z.string(),
      address: z.string(),
      city: z.string(),
      countryCode: z.string(),
      latitude: z.number(),
      postalCode: z.string(),
      longitude: z.number(),
      state: z.string(),
      locationType: z.string(),
      buildingType: z.string()
    })
  )
});

export const geocodeReverseResponse = z.object({
  country: z.string(),
  found: z.boolean(),
  address: z.string(),
  city: z.string(),
  countryCode: z.string(),
  postalCode: z.string(),
  state: z.string(),
  locationType: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.object({
    id: z.string(),
    name: z.string(),
    abbr: z.string(),
    offset: z.string()
  }),
  continentCode: z.string(),
  buildingType: z.string()
});

export const binLookupResponse = z.object({
  country: z.string(),
  ipMatchesBin: z.boolean(),
  cardType: z.string(),
  cardCategory: z.string(),
  ipCountry: z.string(),
  issuer: z.string(),
  ipBlocklisted: z.boolean(),
  valid: z.boolean(),
  issuerWebsite: z.string(),
  countryCode: z.string(),
  cardBrand: z.string(),
  issuerPhone: z.string(),
  isCommercial: z.boolean(),
  isPrepaid: z.boolean(),
  binNumber: z.string()
});

export const convertResponse = z.object({
  valid: z.boolean(),
  result: z.string(),
  fromValue: z.string(),
  toType: z.string(),
  fromType: z.string(),
  resultFloat: z.number(),
  fromName: z.string(),
  fromSymbol: z.string(),
  toName: z.string(),
  toSymbol: z.string()
});

export const badWordFilterResponse = z.object({
  badWordsList: z.array(z.string()),
  badWordsTotal: z.number(),
  censoredContent: z.string(),
  isBad: z.boolean()
});

export const smsVerifyResponse = z.object({
  numberValid: z.boolean(),
  securityCode: z.string(),
  sent: z.boolean()
});

export const verifySecurityCodeResponse = z.object({
  verified: z.boolean()
});

export const urlInfoResponse = z.object({
  httpStatusMessage: z.string(),
  serverCountry: z.string(),
  url: z.string(),
  valid: z.boolean(),
  serverHostname: z.string(),
  loadTime: z.number(),
  contentSize: z.number(),
  httpStatus: z.number(),
  serverCountryCode: z.string(),
  serverIp: z.string(),
  contentType: z.string(),
  content: z.string(),
  isTimeout: z.boolean(),
  title: z.string(),
  languageCode: z.string()
});

export const domainLookupResponse = z.object({
  domain: z.string(),
  isMalicious: z.boolean(),
  blocklists: z.array(z.string()),
  sensors: z.array(
    z.object({
      id: z.number(),
      blocklist: z.string(),
      description: z.string()
    })
  ),
  valid: z.boolean(),
  fqdn: z.string(),
  isSubdomain: z.boolean(),
  tld: z.string(),
  tldCc: z.string(),
  rank: z.number(),
  isGov: z.boolean(),
  isOpennic: z.boolean(),
  isPending: z.boolean(),
  isAdult: z.boolean(),
  registeredDate: z.string(),
  age: z.number(),
  registrarName: z.string(),
  registrarId: z.number(),
  dnsProvider: z.string(),
  mailProvider: z.string(),
  expiryDate: z.string(),
  mailStatus: z.string(),
  websiteStatus: z.string(),
  websiteProvider: z.string()
});

export const uaLookupResponse = z.object({
  ua: z.string(),
  type: z.string(),
  name: z.string(),
  version: z.string(),
  versionMajor: z.string(),
  browserEngine: z.string(),
  browserRelease: z.string(),
  os: z.string(),
  osFamily: z.string(),
  osVersion: z.string(),
  osVersionMajor: z.string(),
  isMobile: z.boolean(),
  isWebview: z.boolean(),
  deviceBrand: z.string(),
  deviceModel: z.string(),
  deviceModelCode: z.string(),
  deviceRelease: z.string(),
  devicePrice: z.number(),
  deviceResolution: z.string(),
  devicePpi: z.number(),
  devicePixelRatio: z.number(),
  deviceWidthPx: z.number(),
  deviceHeightPx: z.number(),
  isCurrent: z.boolean(),
  isUaFrozen: z.boolean(),
  deviceWidthMm: z.number(),
  deviceHeightMm: z.number()
});

export const phoneVerifyResponse = z.object({
  numberValid: z.boolean(),
  calling: z.boolean(),
  securityCode: z.string()
});
