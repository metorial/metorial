// Shared by process and routingMatchers so both sides normalize identically.
export interface WhatsAppPhoneNumberMatcher {
  phoneNumberId: string;
}

export let buildWhatsAppPhoneNumberMatcher = (
  phoneNumberId: string
): WhatsAppPhoneNumberMatcher => ({
  phoneNumberId: phoneNumberId.trim()
});

export let buildWhatsAppConnectionRoutingMatchers = (config: {
  phoneNumberId?: string | null;
}): WhatsAppPhoneNumberMatcher[] => {
  let phoneNumberId = config.phoneNumberId?.trim();
  if (!phoneNumberId) return [];
  return [buildWhatsAppPhoneNumberMatcher(phoneNumberId)];
};
