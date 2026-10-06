export type List<T> = { data: T[] };
export type Version = {
  id: string;
  status: string;
  demoUrl?: string;
  screenshotUrl?: string;
  createdAt: string;
  updatedAt?: string;
  files?: Array<{ name: string; content: string; locked: boolean }>;
};
export type Chat = {
  id: string;
  name?: string;
  privacy: string;
  createdAt: string;
  updatedAt?: string;
  favorite?: boolean;
  authorId?: string;
  projectId?: string;
  webUrl: string;
  apiUrl: string;
  latestVersion?: Version;
  messages?: Array<{
    id: string;
    role: string;
    content: string;
    createdAt?: string;
    type?: string;
  }>;
};
export type Project = {
  id: string;
  name: string;
  privacy: string;
  description?: string;
  instructions?: string;
  vercelProjectId?: string;
  createdAt: string;
  updatedAt?: string;
  apiUrl: string;
  webUrl: string;
  chats?: Chat[];
};
export type Deployment = {
  id: string;
  projectId?: string;
  chatId: string;
  versionId: string;
  inspectorUrl?: string;
  apiUrl?: string;
  webUrl?: string;
};
export type EnvVar = {
  id: string;
  key: string;
  value?: string;
  decrypted?: boolean;
  createdAt?: number;
  updatedAt?: number;
};
export type Hook = {
  id: string;
  name: string;
  events?: string[];
  chatId?: string;
  url?: string;
};
export type User = {
  id: string;
  name?: string;
  email: string;
  avatar?: string;
  createdAt?: string;
};
