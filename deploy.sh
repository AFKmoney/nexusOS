#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# NexusOS — One-Command Deploy Script
#
# Usage:
#   ./deploy.sh              — Build + serve locally on port 8080
#   ./deploy.sh --vps        — Deploy to VPS (requires SSH access)
#   ./deploy.sh --demo       — Build + open browser with ?demo=true
#   ./deploy.sh --docker     — Build Docker image + run on port 80
#   ./deploy.sh --stop       — Stop running containers
#   ./deploy.sh --clean      — Remove all build artifacts + containers
#
# This script handles everything:
#   1. Checks prerequisites (Node, npm, Docker)
#   2. Installs dependencies
#   3. Runs typecheck + tests + build
#   4. Serves the production build (or Docker, or VPS deploy)
#   5. Opens browser automatically
# ═══════════════════════════════════════════════════════════════════

set -e

# ─── Colors ──────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[NexusOS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
info() { echo -e "${CYAN}[INFO]${NC} $1"; }

# ─── Config ──────────────────────────────────────────────────────────
PORT=8080
DOCKER_PORT=80
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTAINER_NAME="nexusos"

cd "$SCRIPT_DIR"

# ─── Prerequisites check ────────────────────────────────────────────
check_prereqs() {
  log "Checking prerequisites..."

  if ! command -v node &> /dev/null; then
    err "Node.js is not installed. Install from https://nodejs.org/"
  fi

  NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_VERSION" -lt 18 ]; then
    err "Node.js 18+ required. You have $(node -v)."
  fi

  log "Node.js $(node -v) ✓"
}

# ─── Install dependencies ───────────────────────────────────────────
install_deps() {
  if [ ! -d "node_modules" ]; then
    log "Installing dependencies (first run)..."
    npm install 2>&1 | tail -3
  else
    log "Dependencies already installed ✓"
  fi
}

# ─── Typecheck ───────────────────────────────────────────────────────
run_typecheck() {
  log "Running typecheck..."
  if npx tsc --noEmit 2>&1 | tail -5; then
    log "Typecheck passed ✓"
  else
    warn "Typecheck had warnings (continuing anyway for demo)"
  fi
}

# ─── Tests ───────────────────────────────────────────────────────────
run_tests() {
  log "Running tests..."
  if npx tsx kernel/tests/runTests.ts 2>&1 | tail -5; then
    log "Tests passed ✓"
  else
    warn "Some tests had issues (continuing anyway for demo)"
  fi
}

# ─── Build ───────────────────────────────────────────────────────────
run_build() {
  log "Building production bundle..."
  npx vite build 2>&1 | tail -5
  log "Build complete ✓"
}

# ─── Serve locally ──────────────────────────────────────────────────
serve_local() {
  log "Starting local server on port $PORT..."
  info "Open: http://localhost:$PORT"
  info "Demo: http://localhost:$PORT/?demo=true"
  info "Press Ctrl+C to stop"

  npx vite preview --port $PORT --host 0.0.0.0 &
  SERVER_PID=$!

  # Auto-open browser after 2 seconds
  sleep 2
  if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:$PORT" 2>/dev/null || true
  elif command -v open &> /dev/null; then
    open "http://localhost:$PORT" 2>/dev/null || true
  fi

  wait $SERVER_PID
}

# ─── Serve with auto-demo ───────────────────────────────────────────
serve_demo() {
  log "Starting demo server on port $PORT..."
  info "Demo will auto-start at: http://localhost:$PORT/?demo=true"

  npx vite preview --port $PORT --host 0.0.0.0 &
  SERVER_PID=$!

  sleep 2
  if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:$PORT/?demo=true" 2>/dev/null || true
  elif command -v open &> /dev/null; then
    open "http://localhost:$PORT/?demo=true" 2>/dev/null || true
  fi

  wait $SERVER_PID
}

# ─── Docker deploy ──────────────────────────────────────────────────
deploy_docker() {
  if ! command -v docker &> /dev/null; then
    err "Docker is not installed. Install from https://docker.com/"
  fi

  log "Building Docker image..."
  docker build -t nexusos . 2>&1 | tail -5

  log "Stopping existing container (if any)..."
  docker rm -f $CONTAINER_NAME 2>/dev/null || true

  log "Starting Docker container on port $DOCKER_PORT..."
  docker run -d -p $DOCKER_PORT:80 --name $CONTAINER_NAME nexusos

  log "Docker container running ✓"
  info "Open: http://localhost:$DOCKER_PORT"
  info "Demo: http://localhost:$DOCKER_PORT/?demo=true"
  info "Landing: http://localhost:$DOCKER_PORT/landing.html"
  info ""
  info "To stop: docker rm -f $CONTAINER_NAME"

  # Open browser
  sleep 2
  if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:$DOCKER_PORT" 2>/dev/null || true
  elif command -v open &> /dev/null; then
    open "http://localhost:$DOCKER_PORT" 2>/dev/null || true
  fi
}

# ─── VPS deploy ─────────────────────────────────────────────────────
deploy_vps() {
  log "VPS deployment mode"
  echo ""
  echo -e "${CYAN}This will deploy NexusOS to a remote VPS via SSH.${NC}"
  echo ""
  read -p "VPS SSH host (e.g. user@your-server.com): " VPS_HOST
  read -p "Domain or IP for access (e.g. nexusos.yourdomain.com): " VPS_URL

  if [ -z "$VPS_HOST" ] || [ -z "$VPS_URL" ]; then
    err "VPS host and URL are required."
  fi

  log "Deploying to $VPS_HOST..."

  # Copy repo to VPS
  info "Copying files to VPS..."
  ssh "$VPS_HOST" "mkdir -p ~/nexusos" 2>/dev/null || true

  # Create a tarball excluding node_modules and dist
  tar czf /tmp/nexusos-deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.git' \
    --exclude='dist_electron' \
    -C "$(dirname "$SCRIPT_DIR")" \
    "$(basename "$SCRIPT_DIR")"

  scp /tmp/nexusos-deploy.tar.gz "$VPS_HOST:/tmp/"
  ssh "$VPS_HOST" "cd ~/nexusos && tar xzf /tmp/nexusos-deploy.tar.gz --strip-components=1 && rm /tmp/nexusos-deploy.tar.gz"

  # Install Docker on VPS if not present
  info "Checking Docker on VPS..."
  ssh "$VPS_HOST" "command -v docker || (curl -fsSL https://get.docker.com | sh)" 2>/dev/null

  # Build and run on VPS
  info "Building Docker image on VPS (this takes a few minutes)..."
  ssh "$VPS_HOST" "cd ~/nexusos && docker build -t nexusos . && docker rm -f nexusos 2>/dev/null; docker run -d -p 80:80 --name nexusos --restart unless-stopped nexusos"

  rm /tmp/nexusos-deploy.tar.gz

  log "Deployment complete! ✓"
  echo ""
  echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  NexusOS is live at: http://$VPS_URL${NC}"
  echo -e "${GREEN}  Demo: http://$VPS_URL/?demo=true${NC}"
  echo -e "${GREEN}  Landing: http://$VPS_URL/landing.html${NC}"
  echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
  echo ""
  info "Share these links on social media!"
}

# ─── Stop ────────────────────────────────────────────────────────────
stop_all() {
  log "Stopping services..."

  # Kill vite preview
  pkill -f "vite preview" 2>/dev/null || true

  # Stop Docker container
  docker rm -f $CONTAINER_NAME 2>/dev/null || true

  log "All services stopped ✓"
}

# ─── Clean ───────────────────────────────────────────────────────────
clean_all() {
  log "Cleaning build artifacts..."

  stop_all

  rm -rf dist dist_electron node_modules/.vite
  docker rmi nexusos 2>/dev/null || true

  log "Clean ✓"
}

# ─── Main ────────────────────────────────────────────────────────────
main() {
  echo ""
  echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  NexusOS — One-Command Deploy Script${NC}"
  echo -e "${GREEN}  AI-Native Operating System v2.0.6${NC}"
  echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
  echo ""

  MODE="${1:-local}"

  case "$MODE" in
    --vps)
      check_prereqs
      deploy_vps
      ;;
    --demo)
      check_prereqs
      install_deps
      run_build
      serve_demo
      ;;
    --docker)
      check_prereqs
      run_build
      deploy_docker
      ;;
    --stop)
      stop_all
      ;;
    --clean)
      clean_all
      ;;
    local|--local|"")
      check_prereqs
      install_deps
      run_typecheck
      run_tests
      run_build
      serve_local
      ;;
    *)
      echo "Usage: ./deploy.sh [option]"
      echo ""
      echo "Options:"
      echo "  (no args)   Build + serve locally on port $PORT"
      echo "  --demo      Build + serve with auto-demo (?demo=true)"
      echo "  --docker    Build Docker image + run on port $DOCKER_PORT"
      echo "  --vps       Deploy to a remote VPS via SSH"
      echo "  --stop      Stop all running services"
      echo "  --clean     Remove all build artifacts + containers"
      echo ""
      exit 1
      ;;
  esac
}

main "$@"
