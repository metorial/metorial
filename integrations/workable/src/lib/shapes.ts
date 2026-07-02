export type AnyRecord = Record<string, any>;

export let compact = <T extends AnyRecord>(value: T) =>
  Object.fromEntries(
    Object.entries(value).filter(([, child]) => child !== undefined && child !== null)
  ) as AnyRecord;

let arrayOrEmpty = (value: unknown): any[] => (Array.isArray(value) ? value : []);

let firstRecord = (...values: unknown[]) => {
  for (let value of values) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as AnyRecord;
    }
  }

  return {};
};

export let unwrapCandidate = (result: AnyRecord) => firstRecord(result.candidate, result);

export let unwrapEmployee = (result: AnyRecord) => firstRecord(result.employee, result);

export let unwrapRequisition = (result: AnyRecord) =>
  firstRecord(result.requisition, arrayOrEmpty(result.requisitions)[0], result);

export let mapLocation = (location: AnyRecord | undefined) =>
  location
    ? compact({
        city: location.city,
        region: location.region,
        regionCode: location.region_code,
        country: location.country,
        countryCode: location.country_code,
        zipCode: location.zip_code,
        locationStr: location.location_str,
        telecommuting: location.telecommuting
      })
    : undefined;

export let mapJob = (job: AnyRecord) =>
  compact({
    jobId: job.id,
    shortcode: job.shortcode,
    code: job.code,
    title: job.title,
    fullTitle: job.full_title,
    department: typeof job.department === 'string' ? job.department : job.department?.name,
    departmentId: typeof job.department === 'object' ? job.department?.id : undefined,
    departmentHierarchy: job.department_hierarchy?.map((department: AnyRecord) =>
      compact({
        departmentId: department.id,
        name: department.name
      })
    ),
    location: mapLocation(job.location),
    locations: job.locations,
    workplaceType: job.workplace_type,
    state: job.state,
    confidential: job.confidential,
    url: job.url,
    shortlink: job.shortlink,
    applicationUrl: job.application_url,
    salary: job.salary
      ? compact({
          salaryFrom: job.salary.salary_from,
          salaryTo: job.salary.salary_to,
          currency: job.salary.salary_currency
        })
      : undefined,
    createdAt: job.created_at,
    updatedAt: job.updated_at
  });

export let mapJobDetails = (job: AnyRecord) =>
  compact({
    ...mapJob(job),
    description: job.description,
    fullDescription: job.full_description,
    requirements: job.requirements,
    benefits: job.benefits,
    employmentType: job.employment_type,
    industry: job.industry,
    function: job.function,
    experience: job.experience,
    education: job.education,
    keywords: job.keywords
  });

export let mapCandidateSummary = (candidate: AnyRecord) =>
  compact({
    candidateId: candidate.id,
    name: candidate.name,
    firstname: candidate.firstname,
    lastname: candidate.lastname,
    headline: candidate.headline,
    email: candidate.email,
    stage: candidate.stage,
    stageKind: candidate.stage_kind,
    jobShortcode: candidate.job?.shortcode ?? candidate.job_shortcode,
    jobTitle: candidate.job?.title ?? candidate.job_title,
    disqualified: candidate.disqualified,
    withdrew: candidate.withdrew,
    sourced: candidate.sourced,
    profileUrl: candidate.profile_url,
    createdAt: candidate.created_at,
    updatedAt: candidate.updated_at
  });

export let mapCandidateDetails = (candidate: AnyRecord) =>
  compact({
    ...mapCandidateSummary(candidate),
    phone: candidate.phone,
    address: candidate.address,
    location: candidate.location,
    disqualificationReason: candidate.disqualification_reason,
    disqualifiedAt: candidate.disqualified_at,
    domain: candidate.domain,
    outboundMailbox: candidate.outbound_mailbox,
    uploaderId: candidate.uploader_id,
    coverLetter: candidate.cover_letter,
    summary: candidate.summary,
    skills: candidate.skills,
    resumeUrl: candidate.resume_url,
    resumeMetadata: candidate.resume_metadata,
    originatingCandidateId: candidate.originating_candidate_id,
    imageUrl: candidate.image_url,
    tags: candidate.tags,
    socialProfiles: candidate.social_profiles?.map((profile: AnyRecord) =>
      compact({
        type: profile.type,
        url: profile.url
      })
    ),
    education: candidate.education_entries?.map((entry: AnyRecord) =>
      compact({
        school: entry.school,
        degree: entry.degree,
        fieldOfStudy: entry.field_of_study,
        startDate: entry.start_date,
        endDate: entry.end_date
      })
    ),
    experience: candidate.experience_entries?.map((entry: AnyRecord) =>
      compact({
        title: entry.title,
        company: entry.company,
        industry: entry.industry,
        summary: entry.summary,
        startDate: entry.start_date,
        endDate: entry.end_date,
        current: entry.current
      })
    ),
    answers: candidate.answers?.map((answer: AnyRecord) =>
      compact({
        questionKey: answer.question_key,
        label: answer.label,
        body: answer.body
      })
    )
  });

export let mapCandidateActivity = (activity: AnyRecord) =>
  compact({
    activityId: activity.id,
    action: activity.action,
    body: activity.body,
    createdAt: activity.created_at,
    updatedAt: activity.updated_at,
    memberId: activity.member?.id,
    memberName: activity.member?.name
  });

export let mapCandidateFile = (file: AnyRecord) =>
  compact({
    name: file.name,
    previewUrl: file.preview_url,
    kind: file.kind,
    source: file.source
  });

export let mapMember = (member: AnyRecord) =>
  compact({
    memberId: member.id,
    name: member.name,
    email: member.email,
    headline: member.headline,
    role: member.role,
    status: member.status
  });

export let mapStage = (stage: AnyRecord) =>
  compact({
    slug: stage.slug,
    name: stage.name,
    kind: stage.kind,
    position: stage.position
  });

export let mapDepartment = (department: AnyRecord) =>
  compact({
    departmentId: String(department.id),
    name: department.name,
    parentId: department.parent_id !== undefined ? String(department.parent_id) : undefined,
    children: department.children
  });

export let mapEmployee = (employee: AnyRecord) =>
  compact({
    employeeId: employee.id,
    name: employee.name,
    firstname: employee.firstname,
    lastname: employee.lastname,
    email: employee.email,
    workEmail: employee.work_email,
    phone: employee.phone,
    department: employee.department,
    departmentId: employee.department_id,
    jobTitle: employee.job_title,
    state: employee.state,
    status: employee.status ?? employee.state,
    startDate: employee.start_date,
    managerId: employee.manager_id,
    legalEntityId: employee.legal_entity_id,
    workScheduleId: employee.work_schedule_id,
    employmentType: employee.employment_type,
    employeeNumber: employee.employee_number,
    avatar: employee.avatar,
    createdAt: employee.created_at,
    updatedAt: employee.updated_at
  });

export let mapEmployeeDocument = (document: AnyRecord) =>
  compact({
    documentId: document.id,
    filename: document.filename,
    filepath: document.filepath,
    filesize: document.filesize,
    type: document.type,
    createdBy: document.created_by,
    createdAt: document.created_at,
    updatedAt: document.updated_at
  });

export let mapRequisition = (requisition: AnyRecord) =>
  compact({
    requisitionId: requisition.id,
    requisitionCode:
      typeof requisition.code === 'object' ? requisition.code?.value : requisition.code,
    jobTitle: requisition.job_title,
    state: requisition.state,
    jobId: requisition.job?.id ?? requisition.job_id,
    jobShortcode: requisition.job?.shortcode,
    departmentId: requisition.department?.id ?? requisition.department_id,
    department: requisition.department?.name ?? requisition.department,
    countryCode: requisition.location?.country_code ?? requisition.country_code,
    city: requisition.location?.city ?? requisition.city,
    location: requisition.location?.location_str ?? requisition.location_string,
    requesterId: requisition.requester?.id,
    hiringManagerId: requisition.hiring_manager?.id ?? requisition.hiring_manager_id,
    ownerId: requisition.owner?.id ?? requisition.owner_id,
    planDate: requisition.plan_date,
    startDate: requisition.start_date,
    salaryRange: requisition.salary_range,
    employmentType: requisition.employment_type,
    experience: requisition.experience,
    reason: requisition.reason,
    notes: requisition.notes,
    candidateId: requisition.candidate_id,
    approvalGroups: requisition.approval_groups,
    requisitionAttributes: requisition.requisition_attributes,
    createdAt: requisition.created_at,
    updatedAt: requisition.updated_at
  });

export let mapTimeOffCategory = (category: AnyRecord) =>
  compact({
    categoryId: category.id,
    name: category.name,
    type: category.type,
    description: category.description
  });

export let mapTimeOffRequest = (request: AnyRecord) =>
  compact({
    requestId: request.id,
    employeeId: request.employee_id,
    employeeName: request.employee_name ?? request.employee?.name,
    categoryId: request.category_id ?? request.category?.id,
    categoryName: request.category_name ?? request.category?.name,
    fromDate: request.from_date,
    toDate: request.to_date,
    status: request.state ?? request.status,
    note: request.note,
    timeoffTrackingUnit: request.timeoff_tracking_unit,
    halfDays: request.half_days,
    updatedBy: request.updated_by,
    approvals: request.approvals,
    createdAt: request.created_at,
    updatedAt: request.updated_at
  });

export let mapTimeOffBalance = (balance: AnyRecord) =>
  compact({
    categoryId: balance.category_id ?? balance.category?.id,
    categoryName: balance.category_name ?? balance.category?.name,
    balance: balance.balance,
    used: balance.used,
    total: balance.total,
    employeeId: balance.employee_id
  });

export let buildCandidateCreateRequest = (input: AnyRecord) => {
  let candidate = compact({
    name: input.name ?? [input.firstname, input.lastname].filter(Boolean).join(' '),
    firstname: input.firstname,
    lastname: input.lastname,
    email: input.email,
    phone: input.phone,
    headline: input.headline,
    summary: input.summary,
    address: input.address,
    cover_letter: input.coverLetter,
    resume_url: input.resumeUrl,
    resume: input.resume,
    skills: input.skills,
    answers: input.answers,
    custom_fields: input.customFields,
    tags: input.tags,
    image_url: input.imageUrl,
    domain: input.domain,
    recruiter_key: input.recruiterKey,
    disqualified: input.disqualified,
    disqualification_reason: input.disqualificationReason,
    social_profiles: input.socialProfiles?.map((profile: AnyRecord) =>
      compact({
        type: profile.type,
        url: profile.url
      })
    ),
    education_entries: input.education?.map((entry: AnyRecord) =>
      compact({
        school: entry.school,
        degree: entry.degree,
        field_of_study: entry.fieldOfStudy,
        start_date: entry.startDate,
        end_date: entry.endDate
      })
    ),
    experience_entries: input.experience?.map((entry: AnyRecord) =>
      compact({
        title: entry.title,
        company: entry.company,
        industry: entry.industry,
        summary: entry.summary,
        start_date: entry.startDate,
        end_date: entry.endDate,
        current: entry.current
      })
    )
  });

  return {
    params: compact({ stage: input.stage }),
    body: compact({
      sourced: input.sourced,
      candidate
    })
  };
};

export let buildCandidateUpdateBody = (input: AnyRecord) => ({
  candidate: compact({
    name: input.name,
    firstname: input.firstname,
    lastname: input.lastname,
    email: input.email,
    phone: input.phone,
    headline: input.headline,
    summary: input.summary,
    address: input.address,
    cover_letter: input.coverLetter,
    resume_url: input.resumeUrl,
    skills: input.skills,
    answers: input.answers,
    custom_fields: input.customFields,
    tags: input.tags,
    social_profiles: input.socialProfiles,
    education_entries: input.educationEntries,
    experience_entries: input.experienceEntries
  })
});

export let buildEmployeeBody = (input: AnyRecord) =>
  compact({
    member_id: input.memberId,
    state: input.state,
    employee: compact({
      firstname: input.firstname,
      lastname: input.lastname,
      work_email: input.workEmail,
      email: input.email,
      phone: input.phone,
      job_title: input.jobTitle,
      department: input.department,
      department_id: input.departmentId,
      start_date: input.startDate,
      reports_to: input.reportsTo,
      manager_id: input.managerId,
      legal_entity: input.legalEntity,
      legal_entity_id: input.legalEntityId,
      work_schedule: input.workSchedule,
      work_schedule_id: input.workScheduleId,
      employment_type: input.employmentType,
      employee_number: input.employeeNumber,
      custom_fields: input.customFields
    })
  });

export let buildRequisitionBody = (input: AnyRecord) =>
  compact({
    member_id: input.memberId,
    code: input.requisitionCode ? { value: input.requisitionCode } : undefined,
    owner_id: input.ownerId,
    hiring_manager_id: input.hiringManagerId,
    job_title: input.jobTitle,
    plan_date: input.planDate,
    job_id: input.jobId,
    department_id: input.departmentId,
    country_code: input.countryCode,
    state_code: input.stateCode,
    city: input.city,
    subregion: input.subregion,
    coords: input.coords,
    location_string: input.location,
    employment_type: input.employmentType,
    experience: input.experience,
    salary_from: input.salaryFrom,
    salary_to: input.salaryTo,
    salary_currency: input.salaryCurrency,
    salary_frequency: input.salaryFrequency,
    reason: input.reason,
    notes: input.notes,
    requisition_attributes: input.requisitionAttributes
  });

export let buildTimeOffRequestBody = (input: AnyRecord) =>
  compact({
    employee_id: input.employeeId,
    member_id: input.memberId,
    category_id: input.categoryId,
    from_date: input.fromDate,
    to_date: input.toDate,
    half_days: input.halfDays,
    note: input.note
  });

export let resultArray = (result: AnyRecord, ...keys: string[]) => {
  for (let key of keys) {
    if (Array.isArray(result[key])) return result[key];
  }

  return Array.isArray(result) ? result : [];
};
