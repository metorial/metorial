export interface SlateDocsReference {
  name: string;
  url: string;
}

export interface SlateTypedDocsReference<Type extends string> extends SlateDocsReference {
  type?: Type;
}

export type SlateProviderDocsReference = SlateDocsReference;

export type SlateConfigDocsReference = SlateTypedDocsReference<'docs.config.general'>;

export type SlateActionDocsReference = SlateTypedDocsReference<'docs.action.general'>;

export type SlateAuthDocsReference = SlateTypedDocsReference<
  | 'docs.auth.oauth'
  | 'docs.auth.oauth_scopes'
  | 'docs.auth.token'
  | 'docs.auth.service_account'
  | 'docs.auth.custom'
>;
