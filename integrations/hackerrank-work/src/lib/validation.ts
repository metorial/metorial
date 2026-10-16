import { createApiServiceError, pickDefined } from 'slates';

export function validateInteger(value: number | undefined, name: string, minimum?: number) {
  if (
    value !== undefined &&
    (!Number.isSafeInteger(value) || (minimum !== undefined && value < minimum))
  ) {
    throw createApiServiceError(
      `${name} must be an integer${minimum === undefined ? '' : ` of ${minimum} or greater`}.`
    );
  }
}

export function numericId(value: string | undefined, name: string) {
  if (value === undefined) return undefined;
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) {
    throw createApiServiceError(
      `${name} must be a positive integer ID. Use list_interview_templates to discover IDs.`
    );
  }
  return Number(value);
}

export function validateSchedule(from?: string, to?: string) {
  for (let [name, value] of Object.entries({ from, to })) {
    if (
      value !== undefined &&
      (!/T.*(?:Z|[+-]\d{2}:?\d{2})$/.test(value) || !Number.isFinite(Date.parse(value)))
    ) {
      throw createApiServiceError(
        `${name} must be a valid ISO 8601 timestamp including its UTC offset.`
      );
    }
  }
  if (from !== undefined && to !== undefined && Date.parse(from) >= Date.parse(to)) {
    throw createApiServiceError('The end time must be after the start time.');
  }
}

export function testSettings(input: {
  name?: string;
  duration?: number;
  instructions?: string;
  languages?: string[];
  experience?: string;
  experienceLevels?: string[];
  cutoffScore?: number;
  tags?: string[];
  candidateTabSwitch?: boolean;
  hideCompileTest?: boolean;
  roleIds?: string[];
  questionIds?: string[];
  draft?: boolean;
  startTime?: string;
  endTime?: string;
}) {
  validateInteger(input.duration, 'duration');
  validateInteger(input.cutoffScore, 'cutoffScore');
  validateSchedule(input.startTime, input.endTime);
  if (input.experience !== undefined && input.experienceLevels !== undefined) {
    throw createApiServiceError('Provide either experience or experienceLevels, not both.');
  }
  let experience =
    input.experienceLevels ??
    (input.experience === undefined ? undefined : [input.experience]);
  let levels = [
    'Intern',
    'New Graduate',
    '0-2 years',
    '2-5 years',
    '>5 years',
    'All Experience Levels'
  ];
  if (experience?.some(value => !levels.includes(value))) {
    throw createApiServiceError(`Use documented experience levels: ${levels.join(', ')}.`);
  }
  return pickDefined({
    name: input.name,
    duration: input.duration,
    instructions: input.instructions,
    languages: input.languages,
    experience,
    cutoff_score: input.cutoffScore,
    tags: input.tags,
    candidate_tab_switch: input.candidateTabSwitch,
    hide_compile_test: input.hideCompileTest,
    role_ids: input.roleIds,
    questions: input.questionIds,
    draft: input.draft,
    starttime: input.startTime,
    endtime: input.endTime
  });
}
