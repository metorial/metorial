export interface GiteaUser {
  id: number;
  login: string;
  full_name: string;
  email: string;
  avatar_url: string;
  html_url: string;
  created: string;
  is_admin: boolean;
}

export interface GiteaRepository {
  id: number;
  owner: GiteaUser;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  private: boolean;
  fork: boolean;
  mirror: boolean;
  archived: boolean;
  empty: boolean;
  size: number;
  default_branch: string;
  stars_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  open_pr_counter: number;
  has_issues: boolean;
  has_wiki: boolean;
  has_pull_requests: boolean;
  has_projects: boolean;
  created_at: string;
  updated_at: string;
  language: string;
  languages_url: string;
  topics: string[];
}

export interface GiteaBranch {
  name: string;
  commit: {
    id: string;
    message: string;
    url: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
  };
  protected: boolean;
}

export interface GiteaLabel {
  id: number;
  name: string;
  color: string;
  description: string;
  url: string;
}

export interface GiteaMilestone {
  id: number;
  title: string;
  description: string;
  state: string;
  open_issues: number;
  closed_issues: number;
  due_on: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GiteaIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: string;
  html_url: string;
  user: GiteaUser;
  labels: GiteaLabel[];
  milestone: GiteaMilestone | null;
  assignee: GiteaUser | null;
  assignees: GiteaUser[] | null;
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  due_date: string | null;
  pull_request: { merged: boolean; merged_at: string | null } | null;
  repository: { id: number; name: string; full_name: string } | null;
}

export interface GiteaComment {
  id: number;
  html_url: string;
  body: string;
  user: GiteaUser;
  created_at: string;
  updated_at: string;
}

export interface GiteaPullRequest {
  id: number;
  number: number;
  title: string;
  body: string;
  state: string;
  html_url: string;
  user: GiteaUser;
  labels: GiteaLabel[];
  milestone: GiteaMilestone | null;
  assignee: GiteaUser | null;
  assignees: GiteaUser[] | null;
  head: {
    label: string;
    ref: string;
    sha: string;
    repo_id: number;
    repo: GiteaRepository | null;
  };
  base: {
    label: string;
    ref: string;
    sha: string;
    repo_id: number;
    repo: GiteaRepository | null;
  };
  merged: boolean;
  merged_at: string | null;
  merge_base: string;
  mergeable: boolean;
  diff_url: string;
  patch_url: string;
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface GiteaRelease {
  id: number;
  tag_name: string;
  target_commitish: string;
  name: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
  html_url: string;
  author: GiteaUser;
  created_at: string;
  published_at: string;
  assets: GiteaReleaseAsset[];
}

export interface GiteaReleaseAsset {
  id: number;
  name: string;
  size: number;
  download_count: number;
  browser_download_url: string;
  created_at: string;
}

export interface GiteaOrganization {
  id: number;
  name: string;
  full_name: string;
  description: string;
  avatar_url: string;
  website: string;
  location: string;
  visibility: string;
}

export interface GiteaTeam {
  id: number;
  name: string;
  description: string;
  organization: GiteaOrganization | null;
  permission: string;
  units: string[];
  includes_all_repositories: boolean;
}

export interface GiteaFileContent {
  name: string;
  path: string;
  sha: string;
  type: string;
  size: number;
  encoding: string;
  content: string;
  html_url: string;
  download_url: string;
  _links: {
    self: string;
    git: string;
    html: string;
  };
}

export interface GiteaFileResponse {
  content: GiteaFileContent;
  commit: {
    sha: string;
    message: string;
    author: { name: string; email: string; date: string };
    committer: { name: string; email: string; date: string };
  };
}

export interface GiteaCommit {
  sha: string;
  url: string;
  html_url: string;
  commit: {
    message: string;
    author: { name: string; email: string; date: string };
    committer: { name: string; email: string; date: string };
    url: string;
  };
  author: GiteaUser | null;
  committer: GiteaUser | null;
  parents: { sha: string; url: string }[];
}

export interface GiteaTag {
  name: string;
  id: string;
  message: string;
  commit: {
    sha: string;
    url: string;
  };
  zipball_url: string;
  tarball_url: string;
}

export interface GiteaWebhook {
  id: number;
  type: string;
  url: string;
  config: {
    url: string;
    content_type: string;
    secret?: string;
  };
  events: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GiteaNotification {
  id: number;
  repository: GiteaRepository;
  subject: {
    title: string;
    url: string;
    latest_comment_url: string;
    html_url: string;
    type: string;
    state: string;
  };
  unread: boolean;
  pinned: boolean;
  updated_at: string;
}

export interface GiteaWikiPage {
  title: string;
  sub_url: string;
  html_url: string;
  content_base64?: string;
  commit_count?: number;
  last_commit?: {
    sha: string;
    message: string;
    author: { name: string; email: string; date: string };
    committer: { name: string; email: string; date: string };
  };
  sidebar?: string;
  footer?: string;
}
