import { z } from 'zod';
// Allowlisted Harvest v3 response fields from the official OpenAPI schemas.
export const candidateSchema = z.object({
  id: z.number().int().safe().positive(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  preferred_name: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  last_activity_at: z.string().nullable().optional(),
  private: z.boolean().nullable().optional(),
  can_email: z.boolean().optional(),
  time_zone: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  linked_user_ids: z.array(z.number().int().safe()).optional(),
  phone_numbers: z
    .array(z.object({ value: z.string().optional(), type: z.string().optional() }))
    .optional(),
  addresses: z
    .array(z.object({ value: z.string().optional(), type: z.string().optional() }))
    .optional(),
  email_addresses: z
    .array(z.object({ value: z.string().optional(), type: z.string().optional() }))
    .optional(),
  website_addresses: z
    .array(z.object({ value: z.string().optional(), type: z.string().optional() }))
    .optional(),
  social_media_addresses: z.array(z.object({ value: z.string().optional() })).optional(),
  custom_fields: z.record(z.string(), z.unknown()).nullable().optional()
});
export type Candidate = z.infer<typeof candidateSchema>;
export const applicationSchema = z.object({
  id: z.number().int().safe().positive(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  agency_note_id: z.number().int().safe().positive().nullable().optional(),
  candidate_id: z.number().int().safe().positive().optional(),
  coordinator_id: z.number().int().safe().positive().nullable().optional(),
  job_id: z.number().int().safe().positive().nullable().optional(),
  job_post_id: z.number().int().safe().positive().nullable().optional(),
  recruiter_id: z.number().int().safe().positive().nullable().optional(),
  referrer_id: z.number().int().safe().positive().nullable().optional(),
  rejection_reason_id: z.number().int().safe().positive().nullable().optional(),
  source_id: z.number().int().safe().positive().nullable().optional(),
  stage_id: z.number().int().safe().positive().nullable().optional(),
  job_interview_stage_id: z.number().int().safe().positive().nullable().optional(),
  stage_name: z.string().nullable().optional(),
  status: z.string().optional(),
  needs_decision: z.boolean().nullable().optional(),
  prospect: z.boolean().optional(),
  rejected_at: z.string().nullable().optional(),
  last_activity_at: z.string().nullable().optional(),
  location_address: z.string().nullable().optional(),
  answers: z
    .array(z.object({ question: z.string().optional(), answer: z.string().optional() }))
    .nullable()
    .optional(),
  prospective_job_ids: z.array(z.number().int().safe()).optional(),
  custom_fields: z.record(z.string(), z.unknown()).nullable().optional()
});
export type Application = z.infer<typeof applicationSchema>;
export const jobSchema = z.object({
  id: z.number().int().safe().positive(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  name: z.string().optional(),
  requisition_id: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  confidential: z.boolean().optional(),
  status: z.string().optional(),
  opened_at: z.string().nullable().optional(),
  closed_at: z.string().nullable().optional(),
  is_template: z.boolean().nullable().optional(),
  copied_from_id: z.number().int().safe().positive().nullable().optional(),
  department_id: z.number().int().safe().positive().nullable().optional(),
  office_ids: z.array(z.number().int().safe()).nullable().optional(),
  custom_fields: z.record(z.string(), z.unknown()).nullable().optional()
});
export type Job = z.infer<typeof jobSchema>;
export const offerSchema = z.object({
  id: z.number().int().safe().positive(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  version: z.number().int().safe().optional(),
  application_id: z.number().int().safe().positive().optional(),
  job_id: z.number().int().safe().positive().optional(),
  candidate_id: z.number().int().safe().positive().optional(),
  opening_id: z.number().int().safe().positive().nullable().optional(),
  status: z.string().optional(),
  starts_on: z.string().nullable().optional(),
  sent_on: z.string().nullable().optional(),
  resolved_at: z.string().nullable().optional(),
  custom_fields: z.record(z.string(), z.unknown()).nullable().optional()
});
export type Offer = z.infer<typeof offerSchema>;
export const userSchema = z.object({
  id: z.number().int().safe().positive(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  primary_email: z.string().optional(),
  job_title: z.string().nullable().optional(),
  agency_id: z.number().int().safe().positive().nullable().optional(),
  name: z.string().nullable().optional(),
  deactivated: z.boolean().optional(),
  site_admin: z.boolean().optional(),
  employee_id: z.string().nullable().optional(),
  linked_candidate_ids: z.array(z.number().int().safe()).optional(),
  office_ids: z.array(z.number().int().safe()).optional(),
  department_ids: z.array(z.number().int().safe()).optional(),
  interviewer_tags: z
    .array(z.object({ id: z.number().int().safe().positive(), name: z.string() }))
    .optional(),
  emails: z.array(z.string()).optional(),
  custom_fields: z.record(z.string(), z.unknown()).nullable().optional()
});
export type User = z.infer<typeof userSchema>;
export const departmentSchema = z.object({
  id: z.number().int().safe().positive(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  name: z.string().optional(),
  parent_id: z.number().int().safe().positive().nullable().optional(),
  external_id: z.string().nullable().optional()
});
export type Department = z.infer<typeof departmentSchema>;
export const officeSchema = z.object({
  id: z.number().int().safe().positive(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  name: z.string().optional(),
  parent_id: z.number().int().safe().positive().nullable().optional(),
  external_id: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  primary_in_house_contact_user_id: z.number().int().safe().positive().nullable().optional()
});
export type Office = z.infer<typeof officeSchema>;
export const interviewSchema = z.object({
  id: z.number().int().safe().positive(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  job_id: z.number().int().safe().positive().optional(),
  application_id: z.number().int().safe().positive().optional(),
  job_interview_id: z.number().int().safe().positive().optional(),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  status: z.string().optional(),
  organizer_id: z.number().int().safe().positive().nullable().optional(),
  scheduled_at: z.string().nullable().optional(),
  all_day_start_on: z.string().nullable().optional(),
  all_day_end_on: z.string().nullable().optional(),
  external_event_id: z.string().nullable().optional(),
  video_conferencing_url: z.string().nullable().optional(),
  availability_received_at: z.string().nullable().optional()
});
export type Interview = z.infer<typeof interviewSchema>;
export const noteSchema = z.object({
  id: z.number().int().safe().positive(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  candidate_id: z.number().int().safe().positive().nullable().optional(),
  application_id: z.number().int().safe().positive().nullable().optional(),
  body: z.string().nullable().optional(),
  subject: z.string().nullable().optional(),
  type: z.string().optional(),
  user_id: z.number().int().safe().positive().nullable().optional(),
  email_from: z.string().nullable().optional(),
  email_to: z.string().nullable().optional(),
  email_cc: z.array(z.string()).nullable().optional(),
  import_hash: z.string().nullable().optional(),
  body_with_tags: z.string().nullable().optional(),
  visibility: z.string().nullable().optional(),
  email_attachment_file_names: z.string().nullable().optional()
});
export type Note = z.infer<typeof noteSchema>;
export const stageSchema = z.object({
  id: z.number().int().safe().positive(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  job_id: z.number().int().safe().positive().optional(),
  sort_order: z.number().int().safe().optional(),
  name: z.string().optional(),
  active: z.boolean().optional()
});
export type Stage = z.infer<typeof stageSchema>;
export const tagSchema = z.object({
  id: z.number().int().safe().positive(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  name: z.string().optional()
});
export type Tag = z.infer<typeof tagSchema>;
export const appliedTagSchema = z.object({
  id: z.number().int().safe().positive(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  candidate_tag_id: z.number().int().safe().positive().optional(),
  candidate_id: z.number().int().safe().positive().optional()
});
export type AppliedTag = z.infer<typeof appliedTagSchema>;
export const rejectionReasonSchema = z.object({
  id: z.number().int().safe().positive(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  name: z.string().optional(),
  type: z
    .object({
      id: z.number().int().safe().positive(),
      key: z.string().optional(),
      name: z.string().optional()
    })
    .optional()
});
export type RejectionReason = z.infer<typeof rejectionReasonSchema>;
export const attachmentSchema = z.object({
  id: z.number().int().safe().positive(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  application_id: z.number().int().safe().positive().optional(),
  candidate_id: z.number().int().safe().positive().nullable().optional(),
  type: z.string().optional(),
  filename: z.string().optional(),
  url: z.string().optional()
});
export type Attachment = z.infer<typeof attachmentSchema>;
