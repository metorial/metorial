import { z } from 'zod';
import { nativeId } from './validation';

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(v => (v === null ? undefined : v), schema.optional());
const string = optional(z.string());
const boolean = optional(z.boolean());
const number = optional(z.number().finite());
const relationId = optional(z.number().int().min(0).max(Number.MAX_SAFE_INTEGER));
const record = optional(z.record(z.string(), z.unknown()));
export const storySchema = z.object({
  id: nativeId,
  uuid: string,
  name: string,
  slug: string,
  full_slug: string,
  content: record,
  is_startpage: boolean,
  is_folder: boolean,
  parent_id: relationId,
  published: boolean,
  published_at: string,
  first_published_at: string,
  tag_list: optional(z.array(z.string())),
  lang: string,
  created_at: string,
  updated_at: string,
  path: string
});
export const componentSchema = z.object({
  id: nativeId,
  name: string,
  display_name: string,
  schema: record,
  is_root: boolean,
  is_nestable: boolean,
  created_at: string,
  updated_at: string,
  component_group_uuid: string,
  color: string,
  icon: string
});
export const assetSchema = z.object({
  id: nativeId,
  filename: string,
  space_id: optional(nativeId),
  name: string,
  short_filename: string,
  content_type: string,
  content_length: optional(z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)),
  alt: string,
  title: string,
  copyright: string,
  focus: string,
  source: string,
  is_private: boolean,
  asset_folder_id: relationId,
  created_at: string,
  deleted_at: string,
  permanently_deleted: boolean,
  meta_data: record
});
export const datasourceSchema = z.object({
  id: nativeId,
  name: string,
  slug: string,
  created_at: string
});
export const entrySchema = z.object({
  id: nativeId,
  name: string,
  value: string,
  dimension_value: string,
  datasource_id: optional(nativeId)
});
export const userSchema = z.object({
  id: nativeId,
  email: string,
  real_email: string,
  firstname: string,
  lastname: string,
  friendly_name: string,
  avatar: string
});
export const collaboratorSchema = z.object({
  id: nativeId,
  user_id: optional(nativeId),
  user: optional(userSchema),
  firstname: string,
  lastname: string,
  alt_email: string,
  role: string,
  email: string
});
export const roleSchema = z.object({ id: nativeId, role: string });
export const workflowSchema = z.object({ id: nativeId, name: string });
export const stageSchema = z.object({
  id: nativeId,
  name: string,
  color: string,
  workflow_id: optional(nativeId)
});
export const releaseSchema = z.object({
  id: nativeId,
  name: string,
  release_at: string,
  released: boolean,
  created_at: string,
  timezone: string
});
export const spaceSchema = z.object({
  id: nativeId,
  name: string,
  domain: string,
  plan: string,
  plan_level: number,
  created_at: string,
  region: optional(z.enum(['eu', 'us', 'ca', 'ap', 'cn']))
});
export const tagSchema = z.object({
  id: optional(nativeId),
  name: string,
  taggings_count: number
});
export const activitySchema = z.object({
  id: nativeId,
  trackable_id: relationId,
  trackable_type: string,
  owner_id: relationId,
  key: string,
  created_at: string
});
export type StoryblokStory = z.infer<typeof storySchema>;
export type StoryblokComponent = z.infer<typeof componentSchema>;
export type StoryblokAsset = z.infer<typeof assetSchema>;
export type StoryblokDatasource = z.infer<typeof datasourceSchema>;
export type StoryblokDatasourceEntry = z.infer<typeof entrySchema>;
export type StoryblokCollaborator = z.infer<typeof collaboratorSchema>;
export type StoryblokSpaceRole = z.infer<typeof roleSchema>;
export type StoryblokWorkflow = z.infer<typeof workflowSchema>;
export type StoryblokWorkflowStage = z.infer<typeof stageSchema>;
export type StoryblokRelease = z.infer<typeof releaseSchema>;
export type StoryblokSpace = z.infer<typeof spaceSchema>;
export type StoryblokTag = z.infer<typeof tagSchema>;
export type StoryblokActivity = z.infer<typeof activitySchema>;
