export interface LogoFormat {
  src: string;
  background: string | null;
  format: string;
  height?: number;
  width?: number;
  size?: number;
}

export interface Logo {
  type: string;
  theme: string | null;
  formats: LogoFormat[];
  tags?: string[];
}

export interface BrandColor {
  hex: string;
  type: string;
  brightness: number;
}

export interface BrandFont {
  name: string;
  type: string;
  origin: string | null;
  originId: string | null;
  weights: number[];
}

export interface BrandImage {
  type: string;
  formats: LogoFormat[];
}

export interface BrandLink {
  name: string;
  url: string;
}

export interface Industry {
  score: number;
  id: string;
  name: string;
  emoji: string;
  slug: string;
  parent: {
    id: string;
    name: string;
    emoji: string;
    slug: string;
  } | null;
}

export interface BrandLocation {
  city: string | null;
  country: string | null;
  countryCode: string | null;
  region: string | null;
  state: string | null;
  subregion: string | null;
}

export interface BrandCompany {
  employees: number | null;
  foundedYear: number | null;
  kind: string | null;
  location: BrandLocation | null;
  industries: Industry[];
  financialIdentifiers?: {
    isin: string[];
    ticker: string[];
  };
}

export interface BrandResponse {
  id?: string;
  name: string;
  domain: string;
  claimed: boolean;
  description: string | null;
  longDescription?: string | null;
  qualityScore: number;
  isNsfw: boolean;
  urn?: string;
  links: BrandLink[];
  logos: Logo[];
  colors: BrandColor[];
  fonts: BrandFont[];
  images: BrandImage[];
  company: BrandCompany | null;
}

export interface SearchResult {
  brandId: string;
  name: string;
  domain: string;
  icon: string;
  claimed: boolean;
}

export interface TransactionRequest {
  transactionLabel: string;
  countryCode: string;
}

export interface TransactionResponse extends BrandResponse {}
