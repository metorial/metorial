export interface LogoFormat {
  src: string;
  background: string | null;
  format: string;
  height?: number | null;
  width?: number | null;
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
  name: string | null;
  type: string;
  origin: string | null;
  originId: string | null;
  weights: unknown[];
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
  parent: IndustryParent | IndustryParent[] | null;
}

export interface IndustryParent {
  id: string;
  name: string;
  emoji: string;
  slug: string;
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
  name: string | null;
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
  name: string | null;
  domain: string;
  icon: string | null;
  claimed: boolean;
}

export interface TransactionRequest {
  transactionLabel: string;
  countryCode: string;
}

export interface TransactionResponse extends BrandResponse {}

export interface BrandLookupOptions {
  allowNsfw?: boolean;
  cachedOnly?: boolean;
  palette?: boolean;
}

export interface BrandContextResponse extends Record<string, unknown> {
  meta?: {
    domain: string;
    canonical_name: string;
    resolved_at: string;
  };
}

export interface ViewerResponse extends Record<string, unknown> {
  type: 'api-key' | 'user';
  id: string;
  urn: string;
  name: string | null;
  createdAt: string | null;
  email?: string | null;
  usage?: { used: number; quota: number };
  organization?: { id: string; urn: string; name: string | null };
}
