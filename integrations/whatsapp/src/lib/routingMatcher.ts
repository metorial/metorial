/**
 * Routing identity shared by the webhook trigger group's `process` (built from the
 * verified delivery's `metadata.phone_number_id`) and `routingMatchers` (built from
 * the connection's configured business phone number). Both sides must use this
 * helper so field names and value normalization stay identical.
 */
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
