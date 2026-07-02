#!/bin/bash

NAME_ARG="${1}"

if [ -z "${NAME_ARG}" ]; then
  echo "Usage: $0 <name>"
  exit 1
fi

cd ./${NAME_ARG}

zip -r - . | base64 -b 0 > ../${NAME_ARG}.zip.b64