import { createApiServiceError } from 'slates';
import { z } from 'zod';

// Native DTOs from the current official Canva REST OpenAPI, scoped to these tools.
export const nativeAssetType = z.enum(['image', 'video']);
export const nativeImportStatusState = z.enum(['failed', 'in_progress', 'success']);
export const nativeImportErrorCode = z.enum(['file_too_big', 'import_failed']);
export const nativeImportError = z
  .object({ code: nativeImportErrorCode, message: z.string() })
  .passthrough();
export const nativeImportStatus = z
  .object({ state: nativeImportStatusState, error: nativeImportError.optional() })
  .passthrough();
export const nativeTeamUserSummary = z
  .object({ user_id: z.string(), team_id: z.string() })
  .passthrough();
export const nativeThumbnail = z
  .object({ width: z.number().int().safe(), height: z.number().int().safe(), url: z.string() })
  .passthrough();
export const nativeImageMetadata = z
  .object({
    type: z.enum(['image']),
    width: z.number().int().safe().optional(),
    height: z.number().int().safe().optional(),
    smart_tags: z.array(z.string().max(50)).optional()
  })
  .passthrough();
export const nativeVideoMetadata = z
  .object({
    type: z.enum(['video']),
    width: z.number().int().safe(),
    height: z.number().int().safe(),
    duration: z.number().int().safe().optional()
  })
  .passthrough();
export const nativeAssetMetadata = z.union([nativeImageMetadata, nativeVideoMetadata]);
export const nativeAsset = z
  .object({
    type: nativeAssetType,
    id: z.string(),
    name: z.string(),
    tags: z.array(z.string()),
    import_status: nativeImportStatus.optional(),
    created_at: z.number().int().safe(),
    updated_at: z.number().int().safe(),
    owner: nativeTeamUserSummary,
    thumbnail: nativeThumbnail.optional(),
    metadata: nativeAssetMetadata.optional()
  })
  .passthrough();
export const nativeAssetSummary = z
  .object({
    type: nativeAssetType,
    id: z.string(),
    name: z.string(),
    tags: z.array(z.string()),
    created_at: z.number().int().safe(),
    updated_at: z.number().int().safe(),
    thumbnail: nativeThumbnail.optional()
  })
  .passthrough();
export const nativeDesignLinks = z
  .object({ edit_url: z.string(), view_url: z.string() })
  .passthrough();
export const nativeDesignTypeOutputName = z.enum([
  'doc',
  'email',
  'presentation',
  'sheet',
  'whiteboard',
  'custom',
  'unknown'
]);
export const nativeDesign = z
  .object({
    id: z.string(),
    title: z.string().optional(),
    owner: nativeTeamUserSummary,
    thumbnail: nativeThumbnail.optional(),
    urls: nativeDesignLinks,
    created_at: z.number().int().safe(),
    updated_at: z.number().int().safe(),
    page_count: z.number().int().safe().min(0).optional(),
    design_types: z.array(nativeDesignTypeOutputName)
  })
  .passthrough();
export const nativeDesignSummary = z
  .object({
    id: z.string(),
    title: z.string().optional(),
    url: z.string().optional(),
    thumbnail: nativeThumbnail.optional(),
    urls: nativeDesignLinks,
    created_at: z.number().int().safe(),
    updated_at: z.number().int().safe(),
    page_count: z.number().int().safe().min(0).optional()
  })
  .passthrough();
export const nativeFolder = z
  .object({
    id: z.string(),
    name: z.string(),
    created_at: z.number().int().safe(),
    updated_at: z.number().int().safe(),
    thumbnail: nativeThumbnail.optional()
  })
  .passthrough();
export const nativeCommentContent = z
  .object({ plaintext: z.string(), markdown: z.string().optional() })
  .passthrough();
export const nativeTeamUser = z
  .object({
    user_id: z.string().optional(),
    team_id: z.string().optional(),
    display_name: z.string().optional()
  })
  .passthrough();
export const nativeUserMention = z
  .object({ tag: z.string(), user: nativeTeamUser })
  .passthrough();
export const nativeUser = z
  .object({ id: z.string(), display_name: z.string().optional() })
  .passthrough();
export const nativeCommentThreadType = z
  .object({
    type: z.enum(['comment']),
    content: nativeCommentContent,
    mentions: z.record(z.string(), nativeUserMention),
    assignee: nativeUser.optional(),
    resolver: nativeUser.optional()
  })
  .passthrough();
export const nativeAddSuggestedEdit = z
  .object({ type: z.enum(['add']), text: z.string() })
  .passthrough();
export const nativeDeleteSuggestedEdit = z
  .object({ type: z.enum(['delete']), text: z.string() })
  .passthrough();
export const nativeSuggestionFormat = z.enum([
  'font_family',
  'font_size',
  'font_weight',
  'font_style',
  'color',
  'background_color',
  'decoration',
  'strikethrough',
  'link',
  'letter_spacing',
  'line_height',
  'direction',
  'text_align',
  'list_marker',
  'list_level',
  'margin_inline_start',
  'text_indent',
  'font_size_modifier',
  'vertical_align'
]);
export const nativeFormatSuggestedEdit = z
  .object({ type: z.enum(['format']), format: nativeSuggestionFormat })
  .passthrough();
export const nativeSuggestedEdit = z.union([
  nativeAddSuggestedEdit,
  nativeDeleteSuggestedEdit,
  nativeFormatSuggestedEdit
]);
export const nativeSuggestionStatus = z.enum(['open', 'accepted', 'rejected']);
export const nativeSuggestionThreadType = z
  .object({
    type: z.enum(['suggestion']),
    suggested_edits: z.array(nativeSuggestedEdit).min(1),
    status: nativeSuggestionStatus
  })
  .passthrough();
export const nativeThreadType = z.union([nativeCommentThreadType, nativeSuggestionThreadType]);
export const nativeThread = z
  .object({
    id: z.string(),
    design_id: z.string(),
    thread_type: nativeThreadType,
    author: nativeUser.optional(),
    created_at: z.number().int().safe(),
    updated_at: z.number().int().safe()
  })
  .passthrough();
export const nativeReply = z
  .object({
    id: z.string(),
    design_id: z.string(),
    thread_id: z.string(),
    author: nativeUser.optional(),
    content: nativeCommentContent,
    mentions: z.record(z.string(), nativeUserMention),
    created_at: z.number().int().safe(),
    updated_at: z.number().int().safe()
  })
  .passthrough();
export const nativeBrandTemplate = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,50}$/),
    title: z.string(),
    view_url: z.string(),
    create_url: z.string(),
    thumbnail: nativeThumbnail.optional(),
    created_at: z.number().int().safe(),
    updated_at: z.number().int().safe()
  })
  .passthrough();
export const nativeAssetUploadStatus = z.enum(['failed', 'in_progress', 'success']);
export const nativeAssetUploadErrorCode = z.enum([
  'file_too_big',
  'import_failed',
  'fetch_failed'
]);
export const nativeAssetUploadError = z
  .object({ code: nativeAssetUploadErrorCode, message: z.string() })
  .passthrough();
export const nativeAssetUploadJob = z
  .object({
    id: z.string(),
    status: nativeAssetUploadStatus,
    error: nativeAssetUploadError.optional(),
    asset: nativeAsset.optional()
  })
  .passthrough();
export const nativeDesignExportStatus = z.enum(['failed', 'in_progress', 'success']);
export const nativeExportErrorCode = z.enum([
  'license_required',
  'approval_required',
  'internal_failure'
]);
export const nativeExportError = z
  .object({ code: nativeExportErrorCode, message: z.string() })
  .passthrough();
export const nativeExportJob = z
  .object({
    id: z.string(),
    status: nativeDesignExportStatus,
    urls: z.array(z.string()).optional(),
    error: nativeExportError.optional()
  })
  .passthrough();
export const nativeDesignImportStatus = z.enum(['failed', 'in_progress', 'success']);
export const nativeDesignImportJobResult = z
  .object({ designs: z.array(nativeDesignSummary) })
  .passthrough();
export const nativeDesignImportErrorCode = z.enum([
  'design_creation_throttled',
  'design_import_throttled',
  'duplicate_import',
  'internal_error',
  'invalid_file',
  'fetch_failed'
]);
export const nativeDesignImportError = z
  .object({ code: nativeDesignImportErrorCode, message: z.string() })
  .passthrough();
export const nativeDesignImportJob = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,50}$/),
    status: nativeDesignImportStatus,
    result: nativeDesignImportJobResult.optional(),
    error: nativeDesignImportError.optional()
  })
  .passthrough();
export const nativeDesignAutofillStatus = z.enum(['in_progress', 'success', 'failed']);
export const nativeAutofillTrialInformation = z
  .object({ uses_remaining: z.number().int().safe().min(0), upgrade_url: z.string() })
  .passthrough();
export const nativeCreateDesignAutofillJobResult = z
  .object({
    type: z.enum(['create_design']),
    design: nativeDesignSummary,
    trial_information: nativeAutofillTrialInformation.optional()
  })
  .passthrough();
export const nativeUpdateDesignAutofillJobResult = z
  .object({ type: z.enum(['update_design']), design: nativeDesignSummary })
  .passthrough();
export const nativeDesignAutofillJobResult = z.union([
  nativeCreateDesignAutofillJobResult,
  nativeUpdateDesignAutofillJobResult
]);
export const nativeAutofillErrorCode = z.enum([
  'autofill_error',
  'thumbnail_generation_error',
  'create_design_error',
  'design_approval_error',
  'trial_quota_exceeded',
  'design_update_error'
]);
export const nativeAutofillError = z
  .object({ code: nativeAutofillErrorCode, message: z.string() })
  .passthrough();
export const nativeDesignAutofillJob = z
  .object({
    id: z.string(),
    status: nativeDesignAutofillStatus,
    result: nativeDesignAutofillJobResult.optional(),
    error: nativeAutofillError.optional()
  })
  .passthrough();
export const nativeFolderItem = z
  .object({ type: z.enum(['folder']), folder: nativeFolder })
  .passthrough();
export const nativeDesignItem = z
  .object({ type: z.enum(['design']), design: nativeDesignSummary })
  .passthrough();
export const nativeImageItem = z
  .object({ type: z.enum(['image']), image: nativeAssetSummary })
  .passthrough();
export const nativeBrandTemplateSummary = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,50}$/),
    title: z.string(),
    view_url: z.string(),
    create_url: z.string(),
    thumbnail: nativeThumbnail.optional(),
    created_at: z.number().int().safe(),
    updated_at: z.number().int().safe()
  })
  .passthrough();
export const nativeBrandTemplateItem = z
  .object({ type: z.enum(['brand_template']), brand_template: nativeBrandTemplateSummary })
  .passthrough();
export const nativeFolderItemSummary = z.union([
  nativeFolderItem,
  nativeDesignItem,
  nativeImageItem,
  nativeBrandTemplateItem
]);
export const nativeImageDataField = z.object({ type: z.enum(['image']) }).passthrough();
export const nativeTextDataField = z.object({ type: z.enum(['text']) }).passthrough();
export const nativeChartDataField = z.object({ type: z.enum(['chart']) }).passthrough();
export const nativeSheetDataField = z.object({ type: z.enum(['sheet']) }).passthrough();
export const nativeDataField = z.union([
  nativeImageDataField,
  nativeTextDataField,
  nativeChartDataField,
  nativeSheetDataField
]);
export const nativeDatasetDefinition = z.record(z.string(), nativeDataField);
export const nativeDatasetImageValue = z
  .object({ type: z.enum(['image']), asset_id: z.string() })
  .passthrough();
export const nativeDatasetVideoValue = z
  .object({ type: z.enum(['video']), asset_id: z.string().regex(/^[a-zA-Z0-9_-]{1,50}$/) })
  .passthrough();
export const nativeDatasetTextValue = z
  .object({ type: z.enum(['text']), text: z.string() })
  .passthrough();
export const nativeColumnDataType = z.enum([
  'string',
  'number',
  'date',
  'boolean',
  'media',
  'variant'
]);
export const nativeColumnConfig = z
  .object({ name: z.string().optional(), type: nativeColumnDataType })
  .passthrough();
export const nativeStringDataTableCell = z
  .object({ type: z.enum(['string']), value: z.string().max(10000).optional() })
  .passthrough();
export const nativeNumberCellMetadata = z
  .object({ formatting: z.string().optional() })
  .passthrough();
export const nativeNumberDataTableCell = z
  .object({
    type: z.enum(['number']),
    value: z.number().finite().optional(),
    metadata: nativeNumberCellMetadata.optional()
  })
  .passthrough();
export const nativeBooleanDataTableCell = z
  .object({ type: z.enum(['boolean']), value: z.boolean().optional() })
  .passthrough();
export const nativeDateDataTableCell = z
  .object({ type: z.enum(['date']), value: z.number().int().safe().optional() })
  .passthrough();
export const nativeDataTableImageMimeType = z.enum([
  'image/jpeg',
  'image/heic',
  'image/png',
  'image/svg+xml',
  'image/webp',
  'image/tiff'
]);
export const nativeDataTableAiDisclosure = z.enum(['app_generated', 'none']);
export const nativeDataTableImageUpload = z
  .object({
    type: z.enum(['image_upload']),
    url: z.string(),
    thumbnail_url: z.string(),
    mime_type: nativeDataTableImageMimeType,
    width: z.number().int().safe().optional(),
    height: z.number().int().safe().optional(),
    ai_disclosure: nativeDataTableAiDisclosure
  })
  .passthrough();
export const nativeDataTableVideoMimeType = z.enum([
  'video/avi',
  'video/x-msvideo',
  'image/gif',
  'video/x-m4v',
  'video/x-matroska',
  'video/quicktime',
  'video/mp4',
  'video/mpeg',
  'video/webm',
  'application/json'
]);
export const nativeDataTableVideoUpload = z
  .object({
    type: z.enum(['video_upload']),
    url: z.string(),
    thumbnail_image_url: z.string(),
    thumbnail_video_url: z.string().optional(),
    mime_type: nativeDataTableVideoMimeType,
    width: z.number().int().safe().optional(),
    height: z.number().int().safe().optional(),
    ai_disclosure: nativeDataTableAiDisclosure
  })
  .passthrough();
export const nativeDataTableMedia = z.union([
  nativeDataTableImageUpload,
  nativeDataTableVideoUpload
]);
export const nativeMediaCollectionDataTableCell = z
  .object({ type: z.enum(['media']), value: z.array(nativeDataTableMedia).max(20) })
  .passthrough();
export const nativeDataTableCell = z.union([
  nativeStringDataTableCell,
  nativeNumberDataTableCell,
  nativeBooleanDataTableCell,
  nativeDateDataTableCell,
  nativeMediaCollectionDataTableCell
]);
export const nativeDataTableRow = z
  .object({ cells: z.array(nativeDataTableCell) })
  .passthrough();
export const nativeDataTable = z
  .object({
    column_configs: z.array(nativeColumnConfig).optional(),
    rows: z.array(nativeDataTableRow)
  })
  .passthrough();
export const nativeDatasetChartValue = z
  .object({ type: z.enum(['chart']), chart_data: nativeDataTable })
  .passthrough();
export const nativeDatasetSheetValue = z
  .object({ type: z.enum(['sheet']), sheet_data: nativeDataTable })
  .passthrough();
export const nativeDatasetValue = z.union([
  nativeDatasetImageValue,
  nativeDatasetVideoValue,
  nativeDatasetTextValue,
  nativeDatasetChartValue,
  nativeDatasetSheetValue
]);
export const nativeUsersMeResponse = z
  .object({ team_user: nativeTeamUserSummary })
  .passthrough();
export const nativeUserProfile = z
  .object({ display_name: z.string().optional() })
  .passthrough();
export const nativeUserProfileResponse = z
  .object({ profile: nativeUserProfile })
  .passthrough();
export const nativeExchangeAccessTokenResponse = z
  .object({
    access_token: z.string(),
    refresh_token: z.string(),
    token_type: z.string(),
    expires_in: z.number().int().safe(),
    scope: z.string().optional()
  })
  .passthrough();
export const nativeCustomDesignTypeInput = z
  .object({
    type: z.enum(['custom']),
    width: z.number().int().safe().min(40).max(8000),
    height: z.number().int().safe().min(40).max(8000)
  })
  .passthrough();
export function parseNative<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw createApiServiceError(
      'Canva returned data outside the documented contract. Reconcile any preceding operation before retrying.'
    );
  return result.data;
}
