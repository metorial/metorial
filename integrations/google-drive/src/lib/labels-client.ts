import { createApiServiceError, createAxios, pickDefined } from 'slates';

let GOOGLE_DRIVE_LABELS_API_BASE_URL = 'https://drivelabels.googleapis.com/v2';
export let GOOGLE_DRIVE_LABELS_MAX_PAGE_SIZE = 200;

type DriveLabelView = 'LABEL_VIEW_BASIC' | 'LABEL_VIEW_FULL';
type DriveLabelRole = 'READER' | 'APPLIER' | 'ORGANIZER';

export interface DriveLabelChoice {
  choiceId?: string;
  displayName?: string;
  description?: string;
  lifecycleState?: string;
}

export interface DriveLabelField {
  fieldId?: string;
  queryKey?: string;
  displayName?: string;
  required?: boolean;
  type?: 'text' | 'integer' | 'date' | 'selection' | 'user';
  lifecycleState?: string;
  hasUnpublishedChanges?: boolean;
  choices?: DriveLabelChoice[];
}

export interface DriveLabel {
  labelName: string;
  labelId?: string;
  revisionId?: string;
  labelType?: string;
  title?: string;
  description?: string;
  lifecycleState?: string;
  hasUnpublishedChanges?: boolean;
  disabledPolicy?: {
    hideInSearch?: boolean;
    showInApply?: boolean;
  };
  customer?: string;
  learnMoreUri?: string;
  creatorPerson?: string;
  createTime?: string;
  revisionCreateTime?: string;
  publisherPerson?: string;
  publishTime?: string;
  disablerPerson?: string;
  disableTime?: string;
  canApply?: boolean;
  canRead?: boolean;
  canUpdateSchema?: boolean;
  canDeleteSchema?: boolean;
  canDisableSchema?: boolean;
  canEnableSchema?: boolean;
  fields?: DriveLabelField[];
}

let fieldTypeOf = (raw: any): DriveLabelField['type'] => {
  if (raw?.textOptions) return 'text';
  if (raw?.integerOptions) return 'integer';
  if (raw?.dateOptions) return 'date';
  if (raw?.selectionOptions) return 'selection';
  if (raw?.userOptions) return 'user';
  return undefined;
};

let mapChoice = (raw: any): DriveLabelChoice => ({
  choiceId: raw?.id,
  displayName: raw?.properties?.displayName,
  description: raw?.properties?.description,
  lifecycleState: raw?.lifecycle?.state
});

let mapField = (raw: any): DriveLabelField => ({
  fieldId: raw?.id,
  queryKey: raw?.queryKey,
  displayName: raw?.properties?.displayName,
  required: raw?.properties?.required,
  type: fieldTypeOf(raw),
  lifecycleState: raw?.lifecycle?.state,
  hasUnpublishedChanges: raw?.lifecycle?.hasUnpublishedChanges,
  choices: Array.isArray(raw?.selectionOptions?.choices)
    ? raw.selectionOptions.choices.map(mapChoice)
    : undefined
});

let mapDriveLabel = (raw: any): DriveLabel => {
  let labelName = typeof raw?.name === 'string' ? raw.name : '';
  if (!labelName) {
    throw createApiServiceError(
      'Google Drive Labels API returned a label without its resource name.',
      { reason: 'drive_label_missing_name' }
    );
  }

  let disabledPolicy = raw?.lifecycle?.disabledPolicy;

  return {
    labelName,
    labelId: raw?.id,
    revisionId: raw?.revisionId,
    labelType: raw?.labelType,
    title: raw?.properties?.title,
    description: raw?.properties?.description,
    lifecycleState: raw?.lifecycle?.state,
    hasUnpublishedChanges: raw?.lifecycle?.hasUnpublishedChanges,
    disabledPolicy: disabledPolicy
      ? {
          hideInSearch: disabledPolicy.hideInSearch,
          showInApply: disabledPolicy.showInApply
        }
      : undefined,
    customer: raw?.customer,
    learnMoreUri: raw?.learnMoreUri,
    creatorPerson: raw?.creator?.person,
    createTime: raw?.createTime,
    revisionCreateTime: raw?.revisionCreateTime,
    publisherPerson: raw?.publisher?.person,
    publishTime: raw?.publishTime,
    disablerPerson: raw?.disabler?.person,
    disableTime: raw?.disableTime,
    canApply: raw?.appliedCapabilities?.canApply,
    canRead: raw?.appliedCapabilities?.canRead,
    canUpdateSchema: raw?.schemaCapabilities?.canUpdate,
    canDeleteSchema: raw?.schemaCapabilities?.canDelete,
    canDisableSchema: raw?.schemaCapabilities?.canDisable,
    canEnableSchema: raw?.schemaCapabilities?.canEnable,
    fields: Array.isArray(raw?.fields) ? raw.fields.map(mapField) : undefined
  };
};

let labelNamePattern = /^labels\/[^/\s?#@]+(@(latest|published|[^/\s?#@]+))?$/;

/**
 * Accepts a bare label ID, `labels/{id}`, or either form with an `@latest`,
 * `@published`, or `@{revisionId}` suffix.
 */
export let resolveDriveLabelName = (value: string | undefined) => {
  let trimmed = value?.trim();
  if (!trimmed) {
    throw createApiServiceError(
      'label is required. Call list_drive_labels to discover labels.',
      {
        reason: 'drive_label_required'
      }
    );
  }

  let name = trimmed.startsWith('labels/') ? trimmed : `labels/${trimmed}`;
  if (!labelNamePattern.test(name)) {
    throw createApiServiceError(
      'label must be a label ID or a labels/{id} resource name, optionally followed by @latest, @published, or @{revisionId}.',
      { reason: 'drive_label_invalid_name' }
    );
  }

  return name;
};

// Names are validated by resolveDriveLabelName, so they contain no reserved URL characters.
let labelPath = (name: string) => `/${name}`;

export class GoogleDriveLabelsClient {
  private api;

  constructor(token: string) {
    this.api = createAxios({
      baseURL: GOOGLE_DRIVE_LABELS_API_BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  async listLabels(params: {
    publishedOnly?: boolean;
    languageCode?: string;
    minimumRole?: DriveLabelRole;
    view?: DriveLabelView;
    pageSize?: number;
    pageToken?: string;
  }): Promise<{ labels: DriveLabel[]; nextPageToken?: string }> {
    let response = await this.api.get('/labels', {
      params: pickDefined(params)
    });

    return {
      labels: (response.data?.labels ?? []).map(mapDriveLabel),
      nextPageToken: response.data?.nextPageToken || undefined
    };
  }

  async getLabel(
    name: string,
    params: { languageCode?: string; view?: DriveLabelView }
  ): Promise<DriveLabel> {
    let response = await this.api.get(labelPath(name), { params: pickDefined(params) });
    return mapDriveLabel(response.data);
  }
}
