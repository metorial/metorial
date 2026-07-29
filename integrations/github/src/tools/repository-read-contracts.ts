import { z } from 'zod';

export let paginationInputShape = {
  perPage: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .describe('Results per page for pagination (minimum 1, maximum 100)'),
  page: z.number().min(1).optional().describe('Page number for pagination (minimum 1)')
};

export let accountSchema = z.object({
  login: z.string().describe('GitHub login'),
  id: z.number().describe('Numeric account ID'),
  nodeId: z.string().optional().describe('GraphQL node ID'),
  htmlUrl: z.string().optional().describe('GitHub profile URL'),
  avatarUrl: z.string().optional().describe('Avatar URL')
});

export let signatureSchema = z.object({
  name: z.string().nullable().describe('Name recorded in Git'),
  email: z.string().nullable().describe('Email recorded in Git'),
  date: z.string().nullable().describe('ISO 8601 timestamp'),
  account: accountSchema.nullable().describe('Matched GitHub account, when available')
});

export let commitFileSchema = z.object({
  filename: z.string().describe('Repository-relative file path'),
  status: z.string().describe('Change status'),
  additions: z.number().describe('Added lines'),
  deletions: z.number().describe('Deleted lines'),
  changes: z.number().describe('Total changed lines'),
  previousFilename: z.string().optional().describe('Previous path for a renamed file'),
  blobUrl: z.string().optional().describe('URL to the file blob'),
  rawUrl: z.string().optional().describe('URL to the raw file'),
  patch: z.string().optional().describe('Unified diff, included only for full_patch detail')
});

export let commitSchema = z.object({
  sha: z.string().describe('Commit SHA'),
  nodeId: z.string().optional().describe('GraphQL node ID'),
  htmlUrl: z.string().describe('URL to the commit'),
  message: z.string().describe('Commit message'),
  author: signatureSchema.nullable().describe('Commit author'),
  committer: signatureSchema.nullable().describe('Commit committer'),
  parents: z
    .array(z.object({ sha: z.string(), htmlUrl: z.string().optional() }))
    .describe('Parent commits'),
  stats: z
    .object({
      additions: z.number(),
      deletions: z.number(),
      total: z.number()
    })
    .optional()
    .describe('Commit line statistics'),
  files: z.array(commitFileSchema).optional().describe('Changed files for this page')
});

let mapAccount = (value: any) =>
  value
    ? {
        login: value.login,
        id: value.id,
        nodeId: value.node_id,
        htmlUrl: value.html_url,
        avatarUrl: value.avatar_url
      }
    : null;

let mapSignature = (signature: any, account: any) =>
  signature || account
    ? {
        name: signature?.name ?? null,
        email: signature?.email ?? null,
        date: signature?.date ?? null,
        account: mapAccount(account)
      }
    : null;

export let mapCommit = (value: any, detail: 'none' | 'stats' | 'full_patch' = 'stats') => ({
  sha: value.sha,
  nodeId: value.node_id,
  htmlUrl: value.html_url,
  message: value.commit?.message ?? '',
  author: mapSignature(value.commit?.author, value.author),
  committer: mapSignature(value.commit?.committer, value.committer),
  parents: (value.parents ?? []).map((parent: any) => ({
    sha: parent.sha,
    htmlUrl: parent.html_url
  })),
  stats:
    detail === 'none' || !value.stats
      ? undefined
      : {
          additions: value.stats.additions ?? 0,
          deletions: value.stats.deletions ?? 0,
          total: value.stats.total ?? 0
        },
  files:
    detail === 'none'
      ? undefined
      : (value.files ?? []).map((file: any) => ({
          filename: file.filename,
          status: file.status ?? 'unknown',
          additions: file.additions ?? 0,
          deletions: file.deletions ?? 0,
          changes: file.changes ?? 0,
          previousFilename: file.previous_filename,
          blobUrl: file.blob_url,
          rawUrl: file.raw_url,
          patch: detail === 'full_patch' ? file.patch : undefined
        }))
});

export let releaseAssetSchema = z.object({
  assetId: z.number().describe('Release asset ID'),
  nodeId: z.string().optional().describe('GraphQL node ID'),
  name: z.string().describe('Asset file name'),
  label: z.string().nullable().describe('Asset label'),
  state: z.string().describe('Upload state'),
  contentType: z.string().describe('Asset MIME type'),
  size: z.number().describe('Asset size in bytes'),
  downloadCount: z.number().describe('Download count'),
  browserDownloadUrl: z.string().describe('Asset download URL'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let releaseSchema = z.object({
  releaseId: z.number().describe('Release ID'),
  nodeId: z.string().optional().describe('GraphQL node ID'),
  tagName: z.string().describe('Release tag'),
  targetCommitish: z.string().describe('Target branch or commit'),
  name: z.string().nullable().describe('Release title'),
  body: z.string().nullable().describe('Release notes'),
  htmlUrl: z.string().describe('URL to the release'),
  draft: z.boolean().describe('Whether the release is a draft'),
  prerelease: z.boolean().describe('Whether the release is a prerelease'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp'),
  publishedAt: z.string().nullable().describe('Publication timestamp'),
  author: accountSchema.nullable().describe('Release author'),
  tarballUrl: z.string().nullable().describe('Source tarball URL'),
  zipballUrl: z.string().nullable().describe('Source ZIP URL'),
  assets: z.array(releaseAssetSchema).describe('Release assets')
});

export let mapRelease = (value: any) => ({
  releaseId: value.id,
  nodeId: value.node_id,
  tagName: value.tag_name,
  targetCommitish: value.target_commitish ?? '',
  name: value.name ?? null,
  body: value.body ?? null,
  htmlUrl: value.html_url,
  draft: value.draft ?? false,
  prerelease: value.prerelease ?? false,
  createdAt: value.created_at,
  updatedAt: value.updated_at,
  publishedAt: value.published_at ?? null,
  author: mapAccount(value.author),
  tarballUrl: value.tarball_url ?? null,
  zipballUrl: value.zipball_url ?? null,
  assets: (value.assets ?? []).map((asset: any) => ({
    assetId: asset.id,
    nodeId: asset.node_id,
    name: asset.name,
    label: asset.label ?? null,
    state: asset.state,
    contentType: asset.content_type,
    size: asset.size,
    downloadCount: asset.download_count,
    browserDownloadUrl: asset.browser_download_url,
    createdAt: asset.created_at,
    updatedAt: asset.updated_at
  }))
});

export let contentEntrySchema = z.object({
  type: z.string().describe('Content type'),
  name: z.string().describe('Entry name'),
  path: z.string().describe('Repository-relative path'),
  sha: z.string().describe('Git object SHA'),
  size: z.number().describe('Size in bytes'),
  htmlUrl: z.string().nullable().describe('GitHub URL'),
  downloadUrl: z.string().nullable().describe('Provider download URL')
});

export let mapContentEntry = (value: any) => ({
  type: value.type,
  name: value.name,
  path: value.path,
  sha: value.sha,
  size: value.size ?? 0,
  htmlUrl: value.html_url ?? null,
  downloadUrl: value.download_url ?? null
});
