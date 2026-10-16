import { z } from 'zod';

export let emailSchema = z
  .object({
    email: z.string(),
    domain: z.string(),
    username: z.string(),
    isValid: z.boolean(),
    hasTypo: z.boolean(),
    isMxValid: z.boolean(),
    isRegexValid: z.boolean(),
    isCompanyEmail: z.boolean(),
    isFreeEmail: z.boolean(),
    canConnect: z.boolean().optional(),
    isSmtpValid: z.boolean().optional(),
    smtp: z
      .object({ valid: z.boolean().optional(), reason: z.string().optional() })
      .passthrough()
      .optional(),
    isDisposable: z.boolean().optional(),
    isRoleAccount: z.boolean().optional(),
    suggestedCorrection: z.unknown().optional(),
    riskScore: z.number().optional(),
    riskLevel: z.string().optional()
  })
  .passthrough();

export let phoneSchema = z
  .object({
    country: z.string(),
    detectedCountry: z.string(),
    countryName: z.string(),
    countrycode: z.number().int(),
    isValid: z.boolean().optional(),
    isvalid: z.boolean().optional(),
    isMobile: z.boolean(),
    type: z.string(),
    formatted: z
      .object({
        international: z.string(),
        national: z.string(),
        rfc: z.string(),
        e164: z.string()
      })
      .passthrough(),
    isVoip: z.boolean().optional(),
    isDisposable: z.boolean().optional(),
    riskScore: z.number().optional(),
    riskLevel: z.string().optional()
  })
  .passthrough();

export let currencySchema = z
  .object({
    from: z.string(),
    to: z.string(),
    value: z.number(),
    convertedValue: z.number(),
    rate: z.number(),
    changeDirection: z.string().optional(),
    change24hPct: z.number().optional()
  })
  .passthrough();

let soaSchema = z
  .object({
    nsname: z.string(),
    hostmaster: z.string(),
    serial: z.number().int(),
    refresh: z.number().int(),
    retry: z.number().int(),
    expire: z.number().int(),
    minttl: z.number().int()
  })
  .passthrough();
export let dnsSchema = z
  .object({
    domain: z.string(),
    records: z
      .object({
        A: z.array(z.string()).nullable().optional(),
        AAAA: z.array(z.string()).nullable().optional(),
        MX: z
          .array(z.object({ exchange: z.string(), priority: z.number().int() }).passthrough())
          .nullable()
          .optional(),
        NS: z.array(z.string()).nullable().optional(),
        TXT: z.array(z.string()).nullable().optional(),
        CNAME: z.array(z.string()).nullable().optional(),
        SOA: soaSchema.nullable().optional()
      })
      .passthrough()
  })
  .passthrough();

export let sslSchema = z
  .object({
    subject: z.object({ CN: z.string().optional() }).passthrough().optional(),
    issuer: z
      .object({ O: z.string().optional(), CN: z.string().optional() })
      .passthrough()
      .optional(),
    domain: z.string(),
    subjectaltname: z.string().optional(),
    ca: z.boolean(),
    bits: z.number().int(),
    valid_from: z.string(),
    valid_to: z.string(),
    serialNumber: z.string().optional(),
    isExpired: z.boolean().optional(),
    isValid: z.boolean().optional(),
    daysUntilExpiry: z.number().optional(),
    isExpiringSoon: z.boolean().optional(),
    isSelfSigned: z.boolean().optional()
  })
  .passthrough();

export let ipSchema = z
  .object({
    ip: z.string(),
    country: z.string(),
    countryName: z.string(),
    region: z.string(),
    regionName: z.string(),
    city: z.string().optional(),
    timezone: z.string(),
    coordinates: z.array(z.number()).length(2).optional()
  })
  .passthrough();
export let sentimentSchema = z
  .object({
    comparative: z.number(),
    sentimentText: z.string(),
    sentiment: z.number(),
    isPositive: z.boolean(),
    isNegative: z.boolean(),
    normalizedScore: z.number().optional()
  })
  .passthrough();
export let spellingSchema = z
  .object({
    spellPass: z.boolean(),
    mispellingsFound: z.number().int(),
    corrections: z.array(
      z.object({ word: z.string(), suggestions: z.array(z.string()) }).passthrough()
    )
  })
  .passthrough();
export let qrSchema = z
  .object({
    id: z.string().min(1),
    format: z.string().min(1),
    type: z.string(),
    correction: z.string(),
    size: z.number().int(),
    margin: z.number().int(),
    expires: z.number().int(),
    downloadURL: z.string().url()
  })
  .passthrough();
export let qrParametersSchema = z.object({
  value: z.string(),
  type: z.string().optional(),
  format: z.string().optional(),
  size: z.number().optional(),
  margin: z.number().optional(),
  color: z.string().optional(),
  backgroundColor: z.string().optional()
});
export let weatherSchema = z
  .object({
    tempC: z.number().optional(),
    temp_c: z.number().optional(),
    tempF: z.number().optional(),
    temp_f: z.number().optional(),
    windMph: z.number().optional(),
    wind_mph: z.number().optional(),
    windKph: z.number().optional(),
    wind_kph: z.number().optional(),
    windDegree: z.number().optional(),
    wind_degree: z.number().optional(),
    windDir: z.string().optional(),
    wind_dir: z.string().optional(),
    pressureMb: z.number().optional(),
    pressure_mb: z.number().optional(),
    precipMm: z.number().optional(),
    precip_mm: z.number().optional(),
    feelslikeC: z.number().optional(),
    feelslike_c: z.number().optional(),
    feelslikeF: z.number().optional(),
    feelslike_f: z.number().optional(),
    humidity: z.number().optional(),
    condition: z.union([z.string(), z.object({ text: z.string() }).passthrough()]).optional(),
    conditionText: z.string().optional(),
    location: z.object({ name: z.string() }).passthrough().optional(),
    locationName: z.string().optional(),
    forecast: z.array(z.record(z.string(), z.unknown())).optional()
  })
  .passthrough();
export let translationSchema = z
  .object({ sourceLang: z.string(), targetLang: z.string(), translatedText: z.string() })
  .passthrough();
export let analyticsSchema = z
  .object({
    summary: z
      .object({
        plan: z.string(),
        tokensUsed: z.number().int(),
        tokensRemaining: z.number().int(),
        tokensLimit: z.number().int(),
        bonusTokens: z.number().int(),
        usagePercent: z.number(),
        renewalDate: z.string(),
        rateLimit: z.string(),
        isTrialEligible: z.boolean().optional(),
        trialCredits: z.number().int().optional()
      })
      .passthrough(),
    detailed: z.boolean()
  })
  .passthrough();
