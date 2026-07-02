// Gemini API does not support native webhooks or event subscriptions.
// The exported inbound webhook is a generic manual HTTP entrypoint only.
export * from './inbound-webhook';
