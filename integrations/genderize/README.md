# <img src="logo.svg" height="20"> Genderize

Predict gender associations from names using population statistics. Results include male,
female, or unknown predictions, supporting probabilities and data counts, and available
quota metadata. Predictions do not establish an individual's gender identity and do not
represent non-binary identities.

- `predict_gender` accepts up to ten names, preserving existing saved calls.
- `predict_gender_batch` accepts up to 100 names in input order.
- Both tools accept an optional two-letter country code applied to every name.

Use an API key from your account dashboard. Existing connections without a key remain
supported by the integration, subject to the provider's access rules. Every name consumes
quota, including names in a batch. Returned quota reset values are seconds until reset.

See the [official API reference](https://genderize.io/documentation/api/reference).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
