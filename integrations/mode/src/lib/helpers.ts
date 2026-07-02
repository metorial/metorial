export let extractToken = (data: any, field?: string): string => {
  if (field && data?.[field]) return data[field];
  return data?.token || '';
};

export let normalizeReport = (raw: any) => ({
  reportToken: raw.token || '',
  name: raw.name || '',
  description: raw.description || '',
  createdAt: raw.created_at || '',
  updatedAt: raw.updated_at || '',
  archived: raw.archived || false,
  publicUrl: raw.web_preview_image || raw._links?.web_preview?.href || '',
  spaceToken: raw.space_token || '',
  lastRunAt: raw.last_successfully_run_at || ''
});

export let normalizeQuery = (raw: any) => ({
  queryToken: raw.token || '',
  name: raw.name || '',
  rawQuery: raw.raw_query || '',
  dataSourceId: raw.data_source_id || 0,
  createdAt: raw.created_at || '',
  updatedAt: raw.updated_at || ''
});

export let normalizeReportRun = (raw: any) => ({
  runToken: raw.token || '',
  state: raw.state || '',
  pythonState: raw.python_state || '',
  createdAt: raw.created_at || '',
  updatedAt: raw.updated_at || '',
  completedAt: raw.completed_at || '',
  parameters: raw.parameters || {}
});

export let normalizeQueryRun = (raw: any) => ({
  queryRunToken: raw.token || '',
  state: raw.state || '',
  queryToken: raw.query_token || '',
  queryName: raw.query_name || '',
  rawSource: raw.raw_source || '',
  createdAt: raw.created_at || '',
  completedAt: raw.completed_at || '',
  dataSourceId: raw.data_source_id || 0
});

export let normalizeCollection = (raw: any) => ({
  collectionToken: raw.token || '',
  name: raw.name || '',
  description: raw.description || '',
  spaceType: raw.space_type || '',
  state: raw.state || '',
  restricted: raw.restricted || false,
  freeDefault: raw.free_default || false,
  createdAt: raw.created_at || '',
  updatedAt: raw.updated_at || ''
});

export let normalizeDataset = (raw: any) => ({
  datasetToken: raw.token || '',
  name: raw.name || '',
  description: raw.description || '',
  createdAt: raw.created_at || '',
  updatedAt: raw.updated_at || ''
});

export let normalizeDataSource = (raw: any) => ({
  dataSourceToken: raw.token || '',
  name: raw.name || '',
  description: raw.description || '',
  adapter: raw.adapter || '',
  host: raw.host || '',
  database: raw.database || '',
  port: raw.port || 0,
  createdAt: raw.created_at || '',
  updatedAt: raw.updated_at || ''
});

export let normalizeSchedule = (raw: any) => ({
  scheduleToken: raw.token || '',
  name: raw.name || '',
  frequency: raw.cron?.freq || '',
  hour: raw.cron?.hour ?? null,
  minute: raw.cron?.minute ?? null,
  dayOfWeek: raw.cron?.day_of_week ?? null,
  dayOfMonth: raw.cron?.day_of_month ?? null,
  timeZone: raw.cron?.time_zone || '',
  createdAt: raw.created_at || '',
  updatedAt: raw.updated_at || ''
});

export let normalizeDefinition = (raw: any) => ({
  definitionToken: raw.token || '',
  name: raw.name || '',
  description: raw.description || '',
  createdAt: raw.created_at || '',
  updatedAt: raw.updated_at || ''
});

export let normalizeMember = (raw: any) => ({
  membershipToken: raw.token || '',
  state: raw.state || '',
  memberUsername: raw.member_username || '',
  memberEmail: raw.member_email || '',
  memberName: raw.name || raw.member_name || '',
  admin: raw.admin || false,
  createdAt: raw.created_at || '',
  updatedAt: raw.updated_at || ''
});

export let getEmbedded = (data: any, key: string): any[] => {
  return data?._embedded?.[key] || [];
};
