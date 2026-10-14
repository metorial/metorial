# CallerAPI

Look up phone number intelligence and caller identification data, including carrier details, spam scores, and complaint history. Check number portability and past porting events, assess port-out fraud risk, retrieve caller pictures, and check online presence. Compare identity details with carrier records through KYC matching. Read account credits and usage.

Connect with an API key from the CallerAPI dashboard. Current documented APIs use `https://api.callerapi.com` and the `X-Auth` header. Phone numbers use E.164 format. KYC matching and some phone intelligence operations consume account credits.

Caller pictures remain available as `pictureBase64` and are also provided as downloadable files when the response contains a base64 image. Existing caller ID, picture, and port-fraud tools retain their original endpoints because these are not listed in the current reference; availability needs confirmation with an authorized account.

See the [official API documentation](https://docs.callerapi.com/) and [capability reference](./docs/SPEC.md).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
