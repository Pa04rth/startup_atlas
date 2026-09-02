# provisioning/dashboards has no secrets, COPY as-is. datasources.yml is
# generated at container start from templates/datasources.yml.template via
# envsubst (see docker-entrypoint.sh) — Grafana's own documented ${VAR}
# provisioning-expansion wasn't actually taking effect on this build, so
# the substitution happens explicitly, before Grafana ever reads the file.
FROM grafana/grafana:latest
USER root
RUN apk add --no-cache gettext
COPY provisioning/dashboards /etc/grafana/provisioning/dashboards
COPY templates/datasources.yml.template /etc/grafana/datasources.yml.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
USER grafana
ENTRYPOINT ["/docker-entrypoint.sh"]
