import { isApiErrorRecord } from 'slates';

// v2 column mutations return a table; newer variants can return the column itself.
export let fieldCandidates = (response: unknown): Record<string, unknown>[] => {
  if (!isApiErrorRecord(response)) return [];
  if (Array.isArray(response.columns)) {
    return response.columns.filter(isApiErrorRecord);
  }
  return typeof response.fk_model_id === 'string' ? [response] : [];
};

export let resolveCreatedField = (
  response: unknown,
  beforeIds: Set<string>,
  tableId: string,
  requested: { title?: string; uidt?: string }
) => {
  if (isApiErrorRecord(response) && Array.isArray(response.columns) && response.id !== tableId)
    return undefined;
  let candidates = fieldCandidates(response).filter(
    column =>
      typeof column.id === 'string' &&
      !beforeIds.has(column.id) &&
      column.id !== tableId &&
      (column.fk_model_id === undefined || column.fk_model_id === tableId) &&
      (requested.title === undefined || column.title === requested.title.trim()) &&
      (requested.uidt === undefined || column.uidt === requested.uidt)
  );
  return candidates.length === 1 ? candidates[0] : undefined;
};

export let resolveUpdatedField = (response: unknown, fieldId: string) => {
  let candidates = fieldCandidates(response).filter(column => column.id === fieldId);
  return candidates.length === 1 ? candidates[0] : undefined;
};
