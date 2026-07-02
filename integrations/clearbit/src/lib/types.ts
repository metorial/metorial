export interface ClearbitPerson {
  id: string;
  avatar: string | null;
  name: {
    fullName: string | null;
    givenName: string | null;
    familyName: string | null;
  } | null;
  email: string | null;
  gender: string | null;
  location: string | null;
  timeZone: string | null;
  utcOffset: number | null;
  geo: {
    city: string | null;
    state: string | null;
    stateCode: string | null;
    country: string | null;
    countryCode: string | null;
    lat: number | null;
    lng: number | null;
  } | null;
  bio: string | null;
  site: string | null;
  emailProvider: boolean | null;
  fuzzy: boolean | null;
  indexedAt: string | null;
  employment: {
    domain: string | null;
    name: string | null;
    title: string | null;
    role: string | null;
    subRole: string | null;
    seniority: string | null;
  } | null;
  facebook: {
    handle: string | null;
  } | null;
  github: {
    handle: string | null;
    id: number | null;
    avatar: string | null;
    company: string | null;
    blog: string | null;
    followers: number | null;
    following: number | null;
  } | null;
  twitter: {
    handle: string | null;
    id: number | null;
    bio: string | null;
    followers: number | null;
    following: number | null;
    statuses: number | null;
    favorites: number | null;
    location: string | null;
    site: string | null;
    avatar: string | null;
  } | null;
  linkedin: {
    handle: string | null;
  } | null;
  googleplus: {
    handle: string | null;
  } | null;
  gravatar: {
    handle: string | null;
    urls: Array<{ value: string; title: string }> | null;
    avatars: Array<{ url: string; type: string }> | null;
  } | null;
}

export interface ClearbitCompany {
  id: string;
  name: string | null;
  legalName: string | null;
  domain: string | null;
  domainAliases: string[] | null;
  tags: string[] | null;
  description: string | null;
  url: string | null;
  logo: string | null;
  emailProvider: boolean | null;
  type: string | null;
  ticker: string | null;
  phone: string | null;
  foundedYear: number | null;
  location: string | null;
  timeZone: string | null;
  utcOffset: number | null;
  tech: string[] | null;
  indexedAt: string | null;
  site: {
    phoneNumbers: string[] | null;
    emailAddresses: string[] | null;
  } | null;
  category: {
    sector: string | null;
    industryGroup: string | null;
    industry: string | null;
    subIndustry: string | null;
    sicCode: string | null;
    naicsCode: string | null;
  } | null;
  geo: {
    streetNumber: string | null;
    streetName: string | null;
    subPremise: string | null;
    city: string | null;
    postalCode: string | null;
    state: string | null;
    stateCode: string | null;
    country: string | null;
    countryCode: string | null;
    lat: number | null;
    lng: number | null;
  } | null;
  identifiers: {
    usEIN: string | null;
    usCIK: string | null;
  } | null;
  metrics: {
    alexaUsRank: number | null;
    alexaGlobalRank: number | null;
    employees: number | null;
    employeesRange: string | null;
    marketCap: number | null;
    raised: number | null;
    annualRevenue: number | null;
    estimatedAnnualRevenue: string | null;
    fiscalYearEnd: number | null;
  } | null;
  facebook: {
    handle: string | null;
    likes: number | null;
  } | null;
  twitter: {
    handle: string | null;
    id: string | null;
    bio: string | null;
    followers: number | null;
    following: number | null;
    location: string | null;
    site: string | null;
    avatar: string | null;
  } | null;
  linkedin: {
    handle: string | null;
  } | null;
  crunchbase: {
    handle: string | null;
  } | null;
  parent: {
    domain: string | null;
  } | null;
}

export interface ClearbitCombined {
  person: ClearbitPerson | null;
  company: ClearbitCompany | null;
}

export interface ClearbitReveal {
  ip: string;
  fuzzy: boolean;
  domain: string | null;
  type: string | null;
  company: ClearbitCompany | null;
  confidence: string | null;
}

export interface ClearbitProspectResult {
  id: string;
  name: {
    fullName: string | null;
    givenName: string | null;
    familyName: string | null;
  } | null;
  title: string | null;
  role: string | null;
  subRole: string | null;
  seniority: string | null;
  company: {
    name: string | null;
  } | null;
  email: string | null;
  verified: boolean | null;
  phone: string | null;
}

export interface ClearbitProspectorResponse {
  page: number;
  page_size: number;
  total: number;
  results: ClearbitProspectResult[];
}

export interface ClearbitDiscoveryResponse {
  total: number;
  page: number;
  results: ClearbitCompany[];
}

export interface ClearbitNameToDomain {
  name: string | null;
  domain: string | null;
  logo: string | null;
}

export interface ClearbitAutocompleteItem {
  name: string;
  domain: string;
  logo: string;
}

export interface ClearbitRisk {
  id: string;
  live: boolean;
  fingerprint: boolean | null;
  email: {
    valid: boolean | null;
    socialMatch: boolean | null;
    companyMatch: boolean | null;
    nameMatch: boolean | null;
    disposable: boolean | null;
    freeProvider: boolean | null;
    blacklisted: boolean | null;
  } | null;
  address: {
    geoMatch: boolean | null;
  } | null;
  ip: {
    proxy: boolean | null;
    geoMatch: boolean | null;
    blacklisted: boolean | null;
    rateLimited: boolean | null;
  } | null;
  risk: {
    level: string;
    score: number;
    reasons: string[];
  };
}
