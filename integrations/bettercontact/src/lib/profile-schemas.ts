import { z } from 'zod';

let text = z.string().nullable().optional();
let number = z.number().nullable().optional();

let companyFields = {
  company_name: text,
  company_domain: text,
  company_description: text,
  company_linkedin_url: text,
  company_industry: text,
  company_type: text,
  company_founded_year: number,
  company_employees_range_start: number,
  company_employees_range_end: number,
  company_keywords: z.array(z.string()).nullable().optional()
};

export let leadProfileSchema = z
  .object({
    contact_id: number,
    contact_first_name: text,
    contact_last_name: text,
    contact_full_name: text,
    contact_job_title: text,
    contact_seniority: text,
    contact_industry: text,
    contact_linkedin_headline: text,
    contact_linkedin_profile_url: text,
    contact_location_continent: text,
    contact_location_country: text,
    contact_location_state: text,
    contact_location_city: text,
    ...companyFields,
    company_headquarters_city: text,
    company_headquarters_country: text
  })
  .passthrough();

export let companyProfileSchema = z
  .object({
    company_id: number,
    ...companyFields,
    company_website: text,
    company_employees_number: number,
    company_headquarters: text,
    company_head_quarters_city: text,
    company_head_quarters_country: text,
    company_address_city: text,
    company_address_state: text,
    company_address_country: text,
    company_address_zipcode: text
  })
  .passthrough();
