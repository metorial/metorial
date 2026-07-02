export let mapCandidate = (c: any) => ({
  candidateId: c.id?.toString(),
  firstName: c.first_name ?? '',
  lastName: c.last_name ?? '',
  company: c.company ?? null,
  title: c.title ?? null,
  isPrivate: c.is_private ?? false,
  photoUrl: c.photo_url ?? null,
  emailAddresses: (c.email_addresses ?? []).map((e: any) => ({
    value: e.value,
    type: e.type
  })),
  phoneNumbers: (c.phone_numbers ?? []).map((p: any) => ({ value: p.value, type: p.type })),
  addresses: (c.addresses ?? []).map((a: any) => ({ value: a.value, type: a.type })),
  websiteAddresses: (c.website_addresses ?? []).map((w: any) => ({
    value: w.value,
    type: w.type
  })),
  socialMediaAddresses: (c.social_media_addresses ?? []).map((s: any) => ({
    value: s.value,
    type: s.type
  })),
  tags: c.tags ?? [],
  applicationIds: (c.application_ids ?? []).map((id: any) => id?.toString()),
  customFields: c.custom_fields ?? {},
  coordinatorId: c.coordinator?.id?.toString() ?? null,
  recruiterId: c.recruiter?.id?.toString() ?? null,
  createdAt: c.created_at ?? null,
  updatedAt: c.updated_at ?? null,
  lastActivity: c.last_activity ?? null
});

export let mapApplication = (a: any) => ({
  applicationId: a.id?.toString(),
  candidateId: a.candidate_id?.toString(),
  prospect: a.prospect ?? false,
  status: a.status ?? null,
  appliedAt: a.applied_at ?? null,
  rejectedAt: a.rejected_at ?? null,
  lastActivityAt: a.last_activity_at ?? null,
  source: a.source
    ? { sourceId: a.source.id?.toString(), publicName: a.source.public_name }
    : null,
  currentStage: a.current_stage
    ? { stageId: a.current_stage.id?.toString(), name: a.current_stage.name }
    : null,
  jobs: (a.jobs ?? []).map((j: any) => ({ jobId: j.id?.toString(), name: j.name })),
  jobPostId: a.job_post_id?.toString() ?? null,
  creditedTo: a.credited_to
    ? {
        userId: a.credited_to.id?.toString(),
        name: `${a.credited_to.first_name ?? ''} ${a.credited_to.last_name ?? ''}`.trim()
      }
    : null,
  rejectionReason: a.rejection_reason
    ? {
        reasonId: a.rejection_reason.id?.toString(),
        name: a.rejection_reason.name,
        type: a.rejection_reason.type?.name
      }
    : null,
  customFields: a.custom_fields ?? {},
  location: a.location?.address ?? null
});

export let mapJob = (j: any) => ({
  jobId: j.id?.toString(),
  name: j.name ?? '',
  requisitionId: j.requisition_id ?? null,
  status: j.status ?? null,
  confidential: j.confidential ?? false,
  isTemplate: j.is_template ?? false,
  notes: j.notes ?? null,
  departments: (j.departments ?? []).map((d: any) => ({
    departmentId: d.id?.toString(),
    name: d.name
  })),
  offices: (j.offices ?? []).map((o: any) => ({ officeId: o.id?.toString(), name: o.name })),
  hiringTeam: j.hiring_team
    ? {
        hiringManagers: (j.hiring_team.hiring_managers ?? []).map((m: any) => ({
          userId: m.id?.toString(),
          name: m.name
        })),
        recruiters: (j.hiring_team.recruiters ?? []).map((r: any) => ({
          userId: r.id?.toString(),
          name: r.name
        })),
        coordinators: (j.hiring_team.coordinators ?? []).map((c: any) => ({
          userId: c.id?.toString(),
          name: c.name
        }))
      }
    : null,
  openings: (j.openings ?? []).map((o: any) => ({
    openingId: o.id?.toString(),
    status: o.status,
    openedAt: o.opened_at,
    closedAt: o.closed_at
  })),
  customFields: j.custom_fields ?? {},
  createdAt: j.created_at ?? null,
  updatedAt: j.updated_at ?? null,
  openedAt: j.opened_at ?? null,
  closedAt: j.closed_at ?? null
});

export let mapOffer = (o: any) => ({
  offerId: o.id?.toString(),
  version: o.version ?? null,
  applicationId: o.application_id?.toString(),
  candidateId: o.candidate_id?.toString() ?? null,
  jobId: o.job_id?.toString() ?? null,
  status: o.status ?? null,
  createdAt: o.created_at ?? null,
  sentAt: o.sent_at ?? null,
  resolvedAt: o.resolved_at ?? null,
  startsAt: o.starts_at ?? null,
  customFields: o.custom_fields ?? {}
});

export let mapUser = (u: any) => ({
  userId: u.id?.toString(),
  name: u.name ?? '',
  firstName: u.first_name ?? '',
  lastName: u.last_name ?? '',
  primaryEmail: u.primary_email_address ?? null,
  emails: u.emails ?? [],
  disabled: u.disabled ?? false,
  siteAdmin: u.site_admin ?? false,
  createdAt: u.created_at ?? null,
  updatedAt: u.updated_at ?? null
});

export let mapDepartment = (d: any) => ({
  departmentId: d.id?.toString(),
  name: d.name ?? '',
  parentDepartmentId: d.parent_id?.toString() ?? null,
  parentDepartmentIds: (d.parent_department_external_ids ?? []).map((id: any) =>
    id?.toString()
  ),
  childDepartmentIds: (d.child_ids ?? []).map((id: any) => id?.toString()),
  externalId: d.external_id ?? null
});

export let mapOffice = (o: any) => ({
  officeId: o.id?.toString(),
  name: o.name ?? '',
  parentOfficeId: o.parent_id?.toString() ?? null,
  childOfficeIds: (o.child_ids ?? []).map((id: any) => id?.toString()),
  location: o.location ? { name: o.location.name } : null,
  externalId: o.external_id ?? null,
  primaryContactUserId: o.primary_contact_user_id?.toString() ?? null
});

export let mapScheduledInterview = (i: any) => ({
  interviewId: i.id?.toString(),
  applicationId: i.application_id?.toString(),
  externalEventId: i.external_event_id ?? null,
  startAt: i.start?.date_time ?? null,
  endAt: i.end?.date_time ?? null,
  location: i.location ?? null,
  status: i.status ?? null,
  interviewName: i.interview?.name ?? null,
  interviewers: (i.interviewers ?? []).map((int: any) => ({
    userId: int.id?.toString(),
    name: int.name ?? '',
    email: int.email ?? null,
    scorecardId: int.scorecard_id?.toString() ?? null
  })),
  organizer: i.organizer
    ? { userId: i.organizer.id?.toString(), name: i.organizer.name ?? '' }
    : null,
  createdAt: i.created_at ?? null,
  updatedAt: i.updated_at ?? null
});
