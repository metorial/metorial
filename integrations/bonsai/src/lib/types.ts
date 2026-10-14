export interface BonsaiClient {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  companyName?: string;
  website?: string;
  phone?: string;
  jobTitle?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BonsaiProject {
  id: string;
  name: string;
  clientId?: string;
  clientEmail?: string;
  description?: string;
  notes?: string;
  currency?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BonsaiTask {
  id: string;
  title: string;
  description?: string;
  projectId?: string;
  assigneeEmail?: string;
  priority?: string;
  status?: string;
  startDate?: string;
  dueDate?: string;
  timeEstimate?: number;
  billingType?: string;
  tags?: string[];
  recurring?: boolean;
  createdAt?: string;
  updatedAt?: string;
  url?: string;
  assigneeMemberId?: string;
  taskStatusId?: string;
  completedAt?: string;
  archivedAt?: string;
}

export interface BonsaiDeal {
  id: string;
  title: string;
  clientEmail?: string;
  clientId?: string;
  pipelineStage?: string;
  value?: number;
  ownerEmail?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BonsaiTaskTemplate {
  id: string;
  name: string;
}

export interface BonsaiTeamMember {
  memberId: string;
  userId?: string;
  name?: string;
  email?: string;
  role?: string;
  permissionProfile?: string;
  status: string;
}

export interface BonsaiTaskStatus {
  id: string;
  name: string;
  state: string;
  color?: string;
  position?: number;
}
