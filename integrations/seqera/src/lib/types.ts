export interface SeqeraPipeline {
  pipelineId?: number;
  name?: string;
  description?: string;
  icon?: string;
  repository?: string;
  computeEnvId?: string;
  workDir?: string;
  revision?: string;
  configProfiles?: string[];
  paramsText?: string;
  configText?: string;
  preRunScript?: string;
  postRunScript?: string;
  optimizationId?: string;
  labels?: SeqeraLabel[];
  lastUpdated?: string;
}

export interface SeqeraWorkflow {
  id?: string;
  runName?: string;
  sessionId?: string;
  profile?: string;
  workDir?: string;
  repository?: string;
  revision?: string;
  commitId?: string;
  userName?: string;
  status?: string;
  start?: string;
  complete?: string;
  duration?: number;
  commandLine?: string;
  errorMessage?: string;
  errorReport?: string;
  projectName?: string;
  exitStatus?: number;
  stats?: Record<string, any>;
  submit?: string;
  dateCreated?: string;
  lastUpdated?: string;
  ownerId?: number;
  launchId?: string;
}

export interface SeqeraComputeEnv {
  id?: string;
  name?: string;
  description?: string;
  platform?: string;
  config?: Record<string, any>;
  dateCreated?: string;
  lastUpdated?: string;
  lastUsed?: string;
  primary?: boolean;
  status?: string;
  message?: string;
  credentialsId?: string;
  workDir?: string;
}

export interface SeqeraDataset {
  id?: string;
  name?: string;
  description?: string;
  mediaType?: string;
  dateCreated?: string;
  lastUpdated?: string;
  deleted?: boolean;
}

export interface SeqeraCredentials {
  id?: string;
  name?: string;
  description?: string;
  provider?: string;
  dateCreated?: string;
  lastUpdated?: string;
  lastUsed?: string;
  deleted?: boolean;
}

export interface SeqeraSecret {
  id?: number;
  name?: string;
  dateCreated?: string;
  lastUpdated?: string;
}

export interface SeqeraOrganization {
  orgId?: number;
  name?: string;
  fullName?: string;
  description?: string;
  location?: string;
  website?: string;
  logoId?: string;
  logoUrl?: string;
  memberId?: number;
  memberRole?: string;
}

export interface SeqeraWorkspace {
  id?: number;
  name?: string;
  fullName?: string;
  description?: string;
  visibility?: string;
  dateCreated?: string;
  lastUpdated?: string;
  orgId?: number;
  orgName?: string;
}

export interface SeqeraAction {
  id?: string;
  name?: string;
  pipeline?: string;
  source?: string;
  status?: string;
  lastSeen?: string;
  dateCreated?: string;
  lastUpdated?: string;
  event?: string;
  endpoint?: string;
  computeEnvId?: string;
  workDir?: string;
  revision?: string;
}

export interface SeqeraLabel {
  id?: number;
  name?: string;
  value?: string;
  resource?: string;
  isDefault?: boolean;
}

export interface SeqeraTeam {
  teamId?: number;
  name?: string;
  description?: string;
  dateCreated?: string;
  lastUpdated?: string;
  membersCount?: number;
}

export interface SeqeraWorkflowTask {
  taskId?: number;
  name?: string;
  process?: string;
  tag?: string;
  status?: string;
  hash?: string;
  exit?: number;
  submit?: string;
  start?: string;
  complete?: string;
  duration?: number;
  realtime?: number;
  cpus?: number;
  memory?: number;
  rss?: number;
  vmem?: number;
  peakRss?: number;
  peakVmem?: number;
  readBytes?: number;
  writeBytes?: number;
  nativeId?: string;
  container?: string;
  workdir?: string;
  executor?: string;
}

export interface SeqeraParticipant {
  participantId?: number;
  memberId?: number;
  userName?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  teamId?: number;
  teamName?: string;
  teamAvatarUrl?: string;
}

export interface SeqeraLaunchRequest {
  computeEnvId?: string;
  pipeline: string;
  workDir?: string;
  revision?: string;
  configProfiles?: string[];
  paramsText?: string;
  configText?: string;
  preRunScript?: string;
  postRunScript?: string;
  runName?: string;
  stubRun?: boolean;
  resume?: boolean;
  sessionId?: string;
  headJobCpus?: number;
  headJobMemoryMb?: number;
  labelIds?: number[];
}
