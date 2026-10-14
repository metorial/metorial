import { createApiServiceError, isApiErrorRecord } from 'slates';

export let mapMember = (value: unknown) => {
  if (!isApiErrorRecord(value)) {
    throw createApiServiceError('Route4Me returned an invalid member response.', {
      reason: 'invalid_member_response'
    });
  }

  let memberId =
    typeof value.member_id === 'number'
      ? value.member_id
      : typeof value.member_id === 'string' && /^\d+$/.test(value.member_id)
        ? Number(value.member_id)
        : undefined;
  if (memberId === undefined || !Number.isSafeInteger(memberId)) {
    throw createApiServiceError('Route4Me returned a member without a valid member ID.', {
      reason: 'invalid_member_response'
    });
  }

  let readOnly = value.READONLY_USER ?? value.readonly_user;
  let normalizedReadOnly = typeof readOnly === 'string' ? readOnly.toLowerCase() : readOnly;

  return {
    memberId,
    memberEmail: typeof value.member_email === 'string' ? value.member_email : undefined,
    memberFirstName:
      typeof value.member_first_name === 'string' ? value.member_first_name : undefined,
    memberLastName:
      typeof value.member_last_name === 'string' ? value.member_last_name : undefined,
    memberPhone: typeof value.member_phone === 'string' ? value.member_phone : undefined,
    memberType: typeof value.member_type === 'string' ? value.member_type : undefined,
    readOnly:
      normalizedReadOnly === true ||
      normalizedReadOnly === 1 ||
      normalizedReadOnly === 'true' ||
      normalizedReadOnly === '1'
        ? true
        : normalizedReadOnly === false ||
            normalizedReadOnly === 0 ||
            normalizedReadOnly === 'false' ||
            normalizedReadOnly === '0'
          ? false
          : undefined
  };
};
