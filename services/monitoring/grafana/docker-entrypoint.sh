#!/bin/sh
# Substitutes MONITORING_PG_* into the datasource provisioning file
# ourselves with envsubst before Grafana ever starts, instead of relying
# on Grafana's own ${VAR} provisioning-expansion — that's the documented
# behavior, but it wasn't taking effect on this build (datasource kept
# showing "no default database configured" even with the correct ${VAR}
# syntax and env_file wired up). This removes the ambiguity entirely: by
# the time Grafana reads the file, it's already got real values in it.
set -e

mkdir -p /etc/grafana/provisioning/datasources
envsubst < /etc/grafana/datasources.yml.template > /etc/grafana/provisioning/datasources/datasources.yml

exec /run.sh "$@"
