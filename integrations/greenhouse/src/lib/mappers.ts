import { pickDefined } from 'slates';
import { z } from 'zod';
import { parsed } from './helpers';
import {
  applicationSchema,
  candidateSchema,
  departmentSchema,
  interviewSchema,
  jobSchema,
  offerSchema,
  officeSchema,
  userSchema
} from './models';

const mappedId = (value: number | string | null | undefined) =>
  value === undefined || value === null ? value : String(value);
export const candidateOutputSchema = z.object({
  candidateId: z.string(),
  firstName: candidateSchema.shape.first_name,
  lastName: candidateSchema.shape.last_name,
  company: candidateSchema.shape.company,
  title: candidateSchema.shape.title,
  isPrivate: candidateSchema.shape.private,
  emailAddresses: candidateSchema.shape.email_addresses,
  phoneNumbers: candidateSchema.shape.phone_numbers,
  addresses: candidateSchema.shape.addresses,
  websiteAddresses: candidateSchema.shape.website_addresses,
  socialMediaAddresses: candidateSchema.shape.social_media_addresses,
  tags: candidateSchema.shape.tags,
  customFields: candidateSchema.shape.custom_fields,
  createdAt: candidateSchema.shape.created_at,
  updatedAt: candidateSchema.shape.updated_at,
  lastActivity: candidateSchema.shape.last_activity_at,
  canEmail: candidateSchema.shape.can_email,
  timeZone: candidateSchema.shape.time_zone,
  applicationIds: z.array(z.string()).optional(),
  photoUrl: z.string().nullable().optional(),
  coordinatorId: z.string().nullable().optional(),
  recruiterId: z.string().nullable().optional()
});
export const mapCandidate = (value: z.infer<typeof candidateSchema>) =>
  parsed(
    candidateOutputSchema,
    pickDefined({
      candidateId: mappedId(value.id),
      firstName: value.first_name,
      lastName: value.last_name,
      company: value.company,
      title: value.title,
      isPrivate: value.private,
      emailAddresses: value.email_addresses,
      phoneNumbers: value.phone_numbers,
      addresses: value.addresses,
      websiteAddresses: value.website_addresses,
      socialMediaAddresses: value.social_media_addresses,
      tags: value.tags,
      customFields: value.custom_fields,
      createdAt: value.created_at,
      updatedAt: value.updated_at,
      lastActivity: value.last_activity_at,
      canEmail: value.can_email,
      timeZone: value.time_zone
    })
  );
export const applicationOutputSchema = z.object({
  applicationId: z.string(),
  candidateId: z.string().nullable().optional(),
  prospect: applicationSchema.shape.prospect,
  status: applicationSchema.shape.status,
  appliedAt: applicationSchema.shape.created_at,
  rejectedAt: applicationSchema.shape.rejected_at,
  lastActivityAt: applicationSchema.shape.last_activity_at,
  jobId: z.string().nullable().optional(),
  jobPostId: z.string().nullable().optional(),
  coordinatorId: z.string().nullable().optional(),
  recruiterId: z.string().nullable().optional(),
  referrerId: z.string().nullable().optional(),
  sourceId: z.string().nullable().optional(),
  rejectionReasonId: z.string().nullable().optional(),
  applicationStageId: z.string().nullable().optional(),
  customFields: applicationSchema.shape.custom_fields,
  location: applicationSchema.shape.location_address,
  currentStage: z
    .object({ stageId: z.string(), name: z.string().nullable().optional() })
    .nullable()
    .optional(),
  source: z
    .object({ sourceId: z.string(), publicName: z.string().nullable().optional() })
    .nullable()
    .optional(),
  jobs: z.array(z.object({ jobId: z.string(), name: z.string().optional() })).optional(),
  creditedTo: z
    .object({ userId: z.string(), name: z.string().optional() })
    .nullable()
    .optional(),
  rejectionReason: z
    .object({ reasonId: z.string(), name: z.string().optional(), type: z.string().optional() })
    .nullable()
    .optional()
});
export const mapApplication = (value: z.infer<typeof applicationSchema>) =>
  parsed(
    applicationOutputSchema,
    pickDefined({
      applicationId: mappedId(value.id),
      candidateId: mappedId(value.candidate_id),
      prospect: value.prospect,
      status: value.status,
      appliedAt: value.created_at,
      rejectedAt: value.rejected_at,
      lastActivityAt: value.last_activity_at,
      jobId: mappedId(value.job_id),
      jobPostId: mappedId(value.job_post_id),
      coordinatorId: mappedId(value.coordinator_id),
      recruiterId: mappedId(value.recruiter_id),
      referrerId: mappedId(value.referrer_id),
      sourceId: mappedId(value.source_id),
      rejectionReasonId: mappedId(value.rejection_reason_id),
      applicationStageId: mappedId(value.stage_id),
      customFields: value.custom_fields,
      location: value.location_address,
      currentStage:
        value.job_interview_stage_id === undefined
          ? undefined
          : value.job_interview_stage_id === null
            ? null
            : { stageId: String(value.job_interview_stage_id), name: value.stage_name }
    })
  );
export const jobOutputSchema = z.object({
  jobId: z.string(),
  name: jobSchema.shape.name,
  requisitionId: z.string().nullable().optional(),
  status: jobSchema.shape.status,
  confidential: jobSchema.shape.confidential,
  isTemplate: jobSchema.shape.is_template,
  notes: jobSchema.shape.notes,
  departmentId: z.string().nullable().optional(),
  officeIds: z.array(z.string()).nullable().optional(),
  copiedFromId: z.string().nullable().optional(),
  customFields: jobSchema.shape.custom_fields,
  createdAt: jobSchema.shape.created_at,
  updatedAt: jobSchema.shape.updated_at,
  openedAt: jobSchema.shape.opened_at,
  closedAt: jobSchema.shape.closed_at,
  departments: z
    .array(z.object({ departmentId: z.string(), name: z.string().optional() }))
    .optional(),
  offices: z.array(z.object({ officeId: z.string(), name: z.string().optional() })).optional(),
  openings: z
    .array(
      z.object({
        openingId: z.string(),
        status: z.string().nullable().optional(),
        openedAt: z.string().nullable().optional(),
        closedAt: z.string().nullable().optional()
      })
    )
    .optional(),
  hiringTeam: z
    .object({
      hiringManagers: z.array(z.object({ userId: z.string(), name: z.string().optional() })),
      recruiters: z.array(z.object({ userId: z.string(), name: z.string().optional() })),
      coordinators: z.array(z.object({ userId: z.string(), name: z.string().optional() }))
    })
    .nullable()
    .optional(),
  stages: z
    .array(
      z.object({
        stageId: z.string(),
        name: z.string().optional(),
        priority: z.number().optional(),
        active: z.boolean().optional()
      })
    )
    .optional()
});
export const mapJob = (value: z.infer<typeof jobSchema>) =>
  parsed(
    jobOutputSchema,
    pickDefined({
      jobId: mappedId(value.id),
      name: value.name,
      requisitionId: mappedId(value.requisition_id),
      status: value.status,
      confidential: value.confidential,
      isTemplate: value.is_template,
      notes: value.notes,
      departmentId: mappedId(value.department_id),
      officeIds: value.office_ids === null ? null : value.office_ids?.map(String),
      copiedFromId: mappedId(value.copied_from_id),
      customFields: value.custom_fields,
      createdAt: value.created_at,
      updatedAt: value.updated_at,
      openedAt: value.opened_at,
      closedAt: value.closed_at
    })
  );
export const offerOutputSchema = z.object({
  offerId: z.string(),
  version: offerSchema.shape.version,
  applicationId: z.string().nullable().optional(),
  candidateId: z.string().nullable().optional(),
  jobId: z.string().nullable().optional(),
  status: offerSchema.shape.status,
  createdAt: offerSchema.shape.created_at,
  updatedAt: offerSchema.shape.updated_at,
  sentAt: offerSchema.shape.sent_on,
  resolvedAt: offerSchema.shape.resolved_at,
  startsAt: offerSchema.shape.starts_on,
  customFields: offerSchema.shape.custom_fields
});
export const mapOffer = (value: z.infer<typeof offerSchema>) =>
  parsed(
    offerOutputSchema,
    pickDefined({
      offerId: mappedId(value.id),
      version: value.version,
      applicationId: mappedId(value.application_id),
      candidateId: mappedId(value.candidate_id),
      jobId: mappedId(value.job_id),
      status: value.status,
      createdAt: value.created_at,
      updatedAt: value.updated_at,
      sentAt: value.sent_on,
      resolvedAt: value.resolved_at,
      startsAt: value.starts_on,
      customFields: value.custom_fields
    })
  );
export const userOutputSchema = z.object({
  userId: z.string(),
  name: userSchema.shape.name,
  firstName: userSchema.shape.first_name,
  lastName: userSchema.shape.last_name,
  primaryEmail: userSchema.shape.primary_email,
  emails: userSchema.shape.emails,
  disabled: userSchema.shape.deactivated,
  siteAdmin: userSchema.shape.site_admin,
  createdAt: userSchema.shape.created_at,
  updatedAt: userSchema.shape.updated_at
});
export const mapUser = (value: z.infer<typeof userSchema>) =>
  parsed(
    userOutputSchema,
    pickDefined({
      userId: mappedId(value.id),
      name: value.name,
      firstName: value.first_name,
      lastName: value.last_name,
      primaryEmail: value.primary_email,
      emails: value.emails,
      disabled: value.deactivated,
      siteAdmin: value.site_admin,
      createdAt: value.created_at,
      updatedAt: value.updated_at
    })
  );
export const departmentOutputSchema = z.object({
  departmentId: z.string(),
  name: departmentSchema.shape.name,
  parentDepartmentId: z.string().nullable().optional(),
  externalId: z.string().nullable().optional(),
  childDepartmentIds: z.array(z.string()).optional()
});
export const mapDepartment = (value: z.infer<typeof departmentSchema>) =>
  parsed(
    departmentOutputSchema,
    pickDefined({
      departmentId: mappedId(value.id),
      name: value.name,
      parentDepartmentId: mappedId(value.parent_id),
      externalId: mappedId(value.external_id)
    })
  );
export const officeOutputSchema = z.object({
  officeId: z.string(),
  name: officeSchema.shape.name,
  parentOfficeId: z.string().nullable().optional(),
  externalId: z.string().nullable().optional(),
  primaryContactUserId: z.string().nullable().optional(),
  childOfficeIds: z.array(z.string()).optional(),
  location: z.object({ name: z.string() }).nullable().optional()
});
export const mapOffice = (value: z.infer<typeof officeSchema>) =>
  parsed(
    officeOutputSchema,
    pickDefined({
      officeId: mappedId(value.id),
      name: value.name,
      parentOfficeId: mappedId(value.parent_id),
      externalId: mappedId(value.external_id),
      primaryContactUserId: mappedId(value.primary_in_house_contact_user_id),
      location:
        value.location === undefined || value.location === null
          ? value.location
          : { name: value.location }
    })
  );
export const interviewOutputSchema = z.object({
  interviewId: z.string(),
  applicationId: z.string().nullable().optional(),
  jobId: z.string().nullable().optional(),
  jobInterviewId: z.string().nullable().optional(),
  organizerId: z.string().nullable().optional(),
  externalEventId: z.string().nullable().optional(),
  startAt: interviewSchema.shape.starts_at,
  endAt: interviewSchema.shape.ends_at,
  location: interviewSchema.shape.location,
  status: interviewSchema.shape.status,
  allDayStartOn: interviewSchema.shape.all_day_start_on,
  allDayEndOn: interviewSchema.shape.all_day_end_on,
  createdAt: interviewSchema.shape.created_at,
  updatedAt: interviewSchema.shape.updated_at,
  interviewName: z.string().nullable().optional(),
  interviewers: z
    .array(
      z.object({
        userId: z.string(),
        name: z.string().optional(),
        email: z.string().nullable().optional(),
        scorecardId: z.string().nullable().optional()
      })
    )
    .optional(),
  organizer: z
    .object({ userId: z.string(), name: z.string().optional() })
    .nullable()
    .optional()
});
export const mapScheduledInterview = (value: z.infer<typeof interviewSchema>) =>
  parsed(
    interviewOutputSchema,
    pickDefined({
      interviewId: mappedId(value.id),
      applicationId: mappedId(value.application_id),
      jobId: mappedId(value.job_id),
      jobInterviewId: mappedId(value.job_interview_id),
      organizerId: mappedId(value.organizer_id),
      externalEventId: mappedId(value.external_event_id),
      startAt: value.starts_at,
      endAt: value.ends_at,
      location: value.location,
      status: value.status,
      allDayStartOn: value.all_day_start_on,
      allDayEndOn: value.all_day_end_on,
      createdAt: value.created_at,
      updatedAt: value.updated_at
    })
  );
