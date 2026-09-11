# Super Google tool composition

Internal workspace helper for selecting tools from Google integration providers and
rebinding them to one aggregate integration specification.

Each source descriptor supplies the source provider and may map aggregate
configuration into that provider's configuration shape:

```ts
importSuperGoogleTools({
  spec: aggregateSpec,
  sources: [
    {
      integration: 'google-cloud-functions',
      provider: cloudFunctionsProvider,
      mapConfig: config => ({ region: config.cloudFunctionsRegion })
    }
  ],
  manifest,
  authMethodKey: 'oauth'
});
```

Before a source handler runs, its mapped or direct configuration is parsed with
the source provider's configuration schema. The composer preserves source
`ServiceError` instances and normalizes unexpected failures into a
source-labelled `ServiceError` without exposing the original payload.
