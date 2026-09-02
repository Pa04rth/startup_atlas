# Same reasoning as prometheus/Dockerfile — a host bind-mount of this
# directory failed silently on a real Windows Docker Desktop install
# (container started, but the mounted directory came up empty). COPY at
# build time instead.
FROM grafana/grafana:latest
COPY provisioning /etc/grafana/provisioning
