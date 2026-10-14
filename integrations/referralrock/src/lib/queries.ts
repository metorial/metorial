import { createApiServiceError, pickDefined } from 'slates';

export let memberQuery = (input: {
  memberId?: string;
  referralCode?: string;
  email?: string;
  externalIdentifier?: string;
  programId?: string;
}) => {
  if (input.memberId || input.referralCode) {
    return {
      primaryInfo: pickDefined({ memberId: input.memberId, referralCode: input.referralCode })
    };
  }
  if (!input.programId || (!input.email && !input.externalIdentifier)) {
    throw createApiServiceError(
      'Provide memberId or referralCode, or provide programId with email or externalIdentifier. Use list_programs to find the program ID.'
    );
  }
  return {
    secondaryInfo: pickDefined({
      email: input.email,
      externalIdentifier: input.externalIdentifier
    }),
    tertiaryInfo: { programId: input.programId }
  };
};

export let referralQuery = (input: {
  referralId?: string;
  email?: string;
  externalIdentifier?: string;
  phoneNumber?: string;
  programId?: string;
}) => {
  if (input.referralId) return { primaryInfo: { referralId: input.referralId } };
  if (!input.programId || (!input.email && !input.externalIdentifier && !input.phoneNumber)) {
    throw createApiServiceError(
      'Provide referralId, or provide programId with email, externalIdentifier, or phoneNumber. Use list_programs to find the program ID.'
    );
  }
  return {
    secondaryInfo: pickDefined({
      email: input.email,
      externalIdentifier: input.externalIdentifier,
      phoneNumber: input.phoneNumber
    }),
    tertiaryInfo: { ProgramId: input.programId }
  };
};
