export interface User {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
  html_url: string;
  type: string;
}
export interface Workflow {
  id: number;
  name: string;
  path: string;
  state: string;
  created_at: string;
  updated_at: string;
  html_url: string;
  badge_url: string;
}
export interface WorkflowRun {
  id: number;
  name?: string | null;
  display_title: string;
  workflow_id: number;
  head_branch: string | null;
  head_sha: string;
  event: string;
  status: string | null;
  conclusion: string | null;
  run_number: number;
  run_attempt?: number;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_started_at?: string | null;
  actor?: { login: string };
  triggering_actor?: { login: string };
}
export interface Job {
  id: number;
  run_id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
  runner_name: string | null;
  steps?: Array<{
    name: string;
    status: string;
    conclusion: string | null;
    number: number;
    started_at?: string | null;
    completed_at?: string | null;
  }>;
}
export interface Artifact {
  id: number;
  name: string;
  size_in_bytes: number;
  expired: boolean;
  created_at: string | null;
  updated_at: string | null;
  expires_at: string | null;
  workflow_run?: { id?: number } | null;
}
export interface Secret {
  name: string;
  created_at: string;
  updated_at: string;
  visibility?: string;
}
export interface Variable {
  name: string;
  value: string;
  created_at: string;
  updated_at: string;
  visibility?: string;
}
export interface PublicKey {
  key: string;
  key_id: string;
}
export interface RunnerLabel {
  id?: number;
  name: string;
  type?: string;
}
export interface Runner {
  id: number;
  name: string;
  os: string;
  status: string;
  busy: boolean;
  labels: RunnerLabel[];
}
export interface RunnerToken {
  token: string;
  expires_at: string;
}
export interface Cache {
  id: number;
  ref?: string;
  key: string;
  version?: string;
  last_accessed_at?: string;
  created_at?: string;
  size_in_bytes?: number;
}
export interface SelectedActions {
  github_owned_allowed: boolean;
  verified_allowed: boolean;
  patterns_allowed: string[];
}
export interface PendingDeployment {
  environment: { id: number; name: string; html_url: string };
  wait_timer: number;
  wait_timer_started_at: string | null;
  current_user_can_approve: boolean;
}
