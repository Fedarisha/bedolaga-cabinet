#!/usr/bin/env bash
set -euo pipefail

# Deploy cabinet-frontend static build to salfetka5.com.
#
# Steps:
#   1. Build the frontend image.
#   2. Extract the static files into ./cabinet-dist.
#   3. Upload the complete build to a separate staging directory.
#   4. Atomically swap staging with the live directory.
#   5. Recreate Caddy and roll back automatically if the health check fails.

DEPLOY_SSH_TARGET="${DEPLOY_SSH_TARGET:-root@salfetka5.com}"
REMOTE_DIR="${REMOTE_DIR:-/opt/remnawave-cabinet}"
REMOTE_DIST="${REMOTE_DIST:-${REMOTE_DIR}/cabinet-dist}"
TMP_CONTAINER="${TMP_CONTAINER:-tmp_cabinet_$$}"
DEPLOY_ID="${DEPLOY_ID:-$(date -u +%Y%m%dT%H%M%SZ)-$$}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-https://cabinet.salfetka5.com/}"

if [[ ! "$DEPLOY_ID" =~ ^[A-Za-z0-9._-]+$ ]]; then
  printf 'Invalid DEPLOY_ID: only letters, digits, dots, underscores and dashes are allowed.\n' >&2
  exit 1
fi

if [[ "$REMOTE_DIR" == "/" || "$REMOTE_DIST" != "${REMOTE_DIR}/"* ]]; then
  printf 'Unsafe remote paths: REMOTE_DIST must be inside REMOTE_DIR.\n' >&2
  exit 1
fi

REMOTE_STAGE="${REMOTE_DIR}/.cabinet-dist-${DEPLOY_ID}.staging"
REMOTE_PREVIOUS="${REMOTE_DIST}.previous"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_DIST="${REPO_ROOT}/cabinet-dist"

cd "$REPO_ROOT"

log() { printf '\033[1;34m[deploy]\033[0m %s\n' "$*"; }

cleanup() {
  if docker inspect "$TMP_CONTAINER" >/dev/null 2>&1; then
    docker rm -f "$TMP_CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

log "Building image via docker compose"
docker-compose build

IMAGE="bedolaga-cabinet_cabinet-frontend:latest"
log "Built image: $IMAGE"

log "Extracting static files to $LOCAL_DIST"
rm -rf "$LOCAL_DIST"
docker create --name "$TMP_CONTAINER" "$IMAGE" >/dev/null
docker cp "$TMP_CONTAINER":/usr/share/nginx/html "$LOCAL_DIST"
docker rm "$TMP_CONTAINER" >/dev/null

if [[ ! -s "${LOCAL_DIST}/index.html" || ! -d "${LOCAL_DIST}/assets" ]]; then
  printf 'Build output is incomplete: index.html or assets/ is missing.\n' >&2
  exit 1
fi

printf -v prepare_remote_command 'set -e; mkdir -p %q; test ! -e %q; mkdir %q' \
  "$REMOTE_DIR" "$REMOTE_STAGE" "$REMOTE_STAGE"

log "Preparing staging directory ${DEPLOY_SSH_TARGET}:${REMOTE_STAGE}"
# The command is intentionally assembled locally with printf %q.
# shellcheck disable=SC2029
ssh "$DEPLOY_SSH_TARGET" "$prepare_remote_command"

log "Uploading complete build to staging"
rsync -az --delete "${LOCAL_DIST}/" "${DEPLOY_SSH_TARGET}:${REMOTE_STAGE}/"

printf -v activate_remote_command 'bash -s -- %q %q %q %q %q %q' \
  "$REMOTE_DIR" \
  "$REMOTE_DIST" \
  "$REMOTE_STAGE" \
  "$REMOTE_PREVIOUS" \
  "$HEALTHCHECK_URL" \
  "$DEPLOY_ID"

log "Activating staged build atomically"
# The command is intentionally assembled locally with printf %q.
# shellcheck disable=SC2029
ssh "$DEPLOY_SSH_TARGET" "$activate_remote_command" <<'REMOTE_SCRIPT'
set -euo pipefail

remote_dir="$1"
remote_dist="$2"
remote_stage="$3"
remote_previous="$4"
healthcheck_url="$5"
deploy_id="$6"

case "$remote_dist" in
  "$remote_dir"/*) ;;
  *) printf 'Unsafe live directory.\n' >&2; exit 1 ;;
esac

case "$remote_stage" in
  "$remote_dir"/*.staging) ;;
  *) printf 'Unsafe staging directory.\n' >&2; exit 1 ;;
esac

case "$remote_previous" in
  "$remote_dir"/*.previous) ;;
  *) printf 'Unsafe rollback directory.\n' >&2; exit 1 ;;
esac

if [[ ! -s "$remote_stage/index.html" || ! -d "$remote_stage/assets" ]]; then
  printf 'Uploaded build is incomplete.\n' >&2
  exit 1
fi

while IFS= read -r asset_path; do
  if [[ ! -f "${remote_stage}${asset_path}" ]]; then
    printf 'Referenced asset is missing: %s\n' "$asset_path" >&2
    exit 1
  fi
done < <(grep -oE '/assets/[^"[:space:]]+\.(js|css)' "$remote_stage/index.html" | sort -u)

expected_index_hash="$(sha256sum "$remote_stage/index.html" | awk '{print $1}')"

compose_recreate() {
  (
    cd "$remote_dir"
    if docker compose version >/dev/null 2>&1; then
      docker compose up -d --force-recreate
    elif docker-compose version >/dev/null 2>&1; then
      # Compose v1 fails with KeyError: ContainerConfig when recreating a
      # container against recent Docker Engine versions. Removing the old
      # container first avoids that incompatible code path.
      docker-compose down --remove-orphans
      docker-compose up -d
    else
      printf 'Neither Docker Compose v2 nor docker-compose v1 is installed.\n' >&2
      return 1
    fi
  )
}

# Keep exactly one known-good release. The running Caddy container continues
# serving the old directory inode until Compose recreates its bind mount.
if [[ -e "$remote_previous" ]]; then
  rm -rf -- "$remote_previous"
fi

had_previous=false
if [[ -e "$remote_dist" ]]; then
  mv -- "$remote_dist" "$remote_previous"
  had_previous=true
fi

if ! mv -- "$remote_stage" "$remote_dist"; then
  if [[ "$had_previous" == true ]]; then
    mv -- "$remote_previous" "$remote_dist"
  fi
  exit 1
fi

rollback() {
  failed_dist="${remote_stage%.staging}.failed"
  if [[ -e "$failed_dist" ]]; then
    rm -rf -- "$failed_dist"
  fi
  mv -- "$remote_dist" "$failed_dist"
  if [[ "$had_previous" == true && -e "$remote_previous" ]]; then
    mv -- "$remote_previous" "$remote_dist"
    compose_recreate || true
  fi
}

if ! compose_recreate; then
  printf 'Container recreation failed; restoring previous build.\n' >&2
  rollback
  exit 1
fi

served_index_hash=""
for _attempt in $(seq 1 20); do
  served_index_hash="$({
    curl --fail --silent --show-error \
      --header 'Cache-Control: no-cache' \
      "${healthcheck_url}?deploy=${deploy_id}" |
      sha256sum |
      awk '{print $1}'
  } 2>/dev/null || true)"

  if [[ "$served_index_hash" == "$expected_index_hash" ]]; then
    break
  fi
  sleep 1
done

if [[ "$served_index_hash" != "$expected_index_hash" ]]; then
  printf 'Health check did not receive the new index.html; restoring previous build.\n' >&2
  rollback
  exit 1
fi

printf 'Activated release %s; previous build kept at %s\n' "$deploy_id" "$remote_previous"
REMOTE_SCRIPT

log "Done: release ${DEPLOY_ID} is live"
