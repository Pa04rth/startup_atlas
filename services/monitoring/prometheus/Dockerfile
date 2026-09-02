# COPY at build time instead of a host bind-mount — Docker Desktop for
# Windows (confirmed on a real machine, not just a sandboxed dev
# environment) throws a spurious "not a directory" ENOTDIR error trying to
# bind-mount a single host file into this exact path. Baking the config
# into the image at build time sidesteps that mount path entirely.
FROM prom/prometheus:latest
COPY prometheus.yml /etc/prometheus/prometheus.yml
