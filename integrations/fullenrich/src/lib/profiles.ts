import { z } from 'zod';

interface LocationRecord {
  country?: string | null;
  country_code?: string | null;
  city?: string | null;
  region?: string | null;
  line1?: string | null;
  line2?: string | null;
}

interface NetworkProfile {
  url?: string | null;
  connection_count?: number | null;
  follower_count?: number | null;
}

export interface CompanyRecord {
  id?: string | null;
  name?: string | null;
  domain?: string | null;
  description?: string | null;
  year_founded?: number | null;
  headcount?: number | null;
  headcount_range?: string | null;
  company_type?: string | null;
  industry?: { main_industry?: string | null } | null;
  specialties?: string[] | null;
  locations?: { headquarters?: LocationRecord | null } | null;
  social_profiles?: {
    professional_network?: NetworkProfile | null;
    linkedin?: NetworkProfile | null;
  } | null;
}

interface EmploymentRecord {
  title?: string | null;
  company?: CompanyRecord | null;
  is_current?: boolean | null;
  start_at?: string | null;
  end_at?: string | null;
}

export interface PersonRecord {
  id?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  location?: LocationRecord | null;
  social_profiles?: {
    professional_network?: NetworkProfile | null;
    linkedin?: NetworkProfile | null;
  } | null;
  skills?: string[] | null;
  languages?:
    | {
        language?: string | null;
        code?: string | null;
        proficiency?: string | null;
      }[]
    | null;
  educations?:
    | {
        school_name?: string | null;
        degree?: string | null;
        start_at?: string | null;
        end_at?: string | null;
      }[]
    | null;
  employment?: { current?: EmploymentRecord | null; all?: EmploymentRecord[] | null } | null;
}

let locationSchema = z.object({
  country: z.string().optional(),
  countryCode: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional()
});

let employmentSchema = z.object({
  title: z.string().optional(),
  companyName: z.string().optional(),
  companyDomain: z.string().optional(),
  companyId: z.string().optional(),
  companyIndustry: z.string().optional(),
  companyHeadcount: z.number().optional(),
  companyType: z.string().optional(),
  isCurrent: z.boolean().optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional()
});

export let personSchema = z.object({
  personId: z.string().optional(),
  fullName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  location: locationSchema.optional(),
  linkedinUrl: z.string().optional(),
  skills: z.array(z.string()).optional(),
  languages: z
    .array(
      z.object({
        language: z.string().optional(),
        code: z.string().optional(),
        proficiency: z.string().optional()
      })
    )
    .optional(),
  educations: z
    .array(
      z.object({
        schoolName: z.string().optional(),
        degree: z.string().optional(),
        startAt: z.string().optional(),
        endAt: z.string().optional()
      })
    )
    .optional(),
  currentEmployment: employmentSchema.optional(),
  allEmployment: z.array(employmentSchema).optional()
});

export let companySchema = z.object({
  companyId: z.string().optional(),
  name: z.string().optional(),
  domain: z.string().optional(),
  description: z.string().optional(),
  yearFounded: z.number().optional(),
  headcount: z.number().optional(),
  headcountRange: z.string().optional(),
  companyType: z.string().optional(),
  industry: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  headquarters: locationSchema
    .extend({
      line1: z.string().optional(),
      line2: z.string().optional()
    })
    .optional(),
  linkedinUrl: z.string().optional(),
  linkedinFollowerCount: z.number().optional()
});

let mapLocation = (location: LocationRecord) => ({
  country: location.country ?? undefined,
  countryCode: location.country_code ?? undefined,
  city: location.city ?? undefined,
  region: location.region ?? undefined
});

let mapEmployment = (employment: EmploymentRecord) => ({
  title: employment.title ?? undefined,
  companyName: employment.company?.name ?? undefined,
  companyDomain: employment.company?.domain ?? undefined,
  companyId: employment.company?.id ?? undefined,
  companyIndustry: employment.company?.industry?.main_industry ?? undefined,
  companyHeadcount: employment.company?.headcount ?? undefined,
  companyType: employment.company?.company_type ?? undefined,
  isCurrent: employment.is_current ?? undefined,
  startAt: employment.start_at ?? undefined,
  endAt: employment.end_at ?? undefined
});

export let mapPerson = (person: PersonRecord) => ({
  personId: person.id ?? undefined,
  fullName: person.full_name ?? undefined,
  firstName: person.first_name ?? undefined,
  lastName: person.last_name ?? undefined,
  location: person.location ? mapLocation(person.location) : undefined,
  linkedinUrl:
    person.social_profiles?.professional_network?.url ??
    person.social_profiles?.linkedin?.url ??
    undefined,
  skills: person.skills ?? undefined,
  languages: person.languages?.map(language => ({
    language: language.language ?? undefined,
    code: language.code ?? undefined,
    proficiency: language.proficiency ?? undefined
  })),
  educations: person.educations?.map(education => ({
    schoolName: education.school_name ?? undefined,
    degree: education.degree ?? undefined,
    startAt: education.start_at ?? undefined,
    endAt: education.end_at ?? undefined
  })),
  currentEmployment: person.employment?.current
    ? mapEmployment(person.employment.current)
    : undefined,
  allEmployment: person.employment?.all?.map(mapEmployment)
});

export let mapCompany = (company: CompanyRecord) => {
  let network =
    company.social_profiles?.professional_network ?? company.social_profiles?.linkedin;
  let headquarters = company.locations?.headquarters;
  return {
    companyId: company.id ?? undefined,
    name: company.name ?? undefined,
    domain: company.domain ?? undefined,
    description: company.description ?? undefined,
    yearFounded: company.year_founded ?? undefined,
    headcount: company.headcount ?? undefined,
    headcountRange: company.headcount_range ?? undefined,
    companyType: company.company_type ?? undefined,
    industry: company.industry?.main_industry ?? undefined,
    specialties: company.specialties ?? undefined,
    headquarters: headquarters
      ? {
          ...mapLocation(headquarters),
          line1: headquarters.line1 ?? undefined,
          line2: headquarters.line2 ?? undefined
        }
      : undefined,
    linkedinUrl: network?.url ?? undefined,
    linkedinFollowerCount: network?.connection_count ?? network?.follower_count ?? undefined
  };
};
