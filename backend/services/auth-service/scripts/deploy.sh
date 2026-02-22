#!/bin/bash

# Deployment script for AWS EC2
# This script handles deployment of the auth service container

set -e

# Configuration
DOCKER_IMAGE="${DOCKER_IMAGE:-admin}"
DOCKER_TAG="${DOCKER_TAG:-latest}"
CONTAINER_NAME="finflow-auth-service"
POSTGRES_CONTAINER_NAME="finflow-auth-postgres"
NETWORK_NAME="auth-network"
SERVICE_PORT=3001

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if container is running
is_container_running() {
    docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"
}

# Function to check service health
check_health() {
    local max_attempts=30
    local attempt=1
    
    print_info "Checking service health..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:${SERVICE_PORT}/health > /dev/null 2>&1; then
            print_info "Service is healthy!"
            return 0
        fi
        print_warn "Waiting for service to be healthy... ($attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "Health check failed after $max_attempts attempts"
    return 1
}

# Function to rollback to previous version
rollback() {
    print_warn "Rolling back to previous version..."
    
    # Try to find previous container/image
    local previous_image=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep "${DOCKER_IMAGE}" | grep -v "${DOCKER_TAG}" | head -n 1)
    
    if [ -z "$previous_image" ]; then
        print_error "No previous version found for rollback"
        return 1
    fi
    
    print_info "Found previous version: $previous_image"
    
    # Stop current container
    docker stop ${CONTAINER_NAME} || true
    docker rm ${CONTAINER_NAME} || true
    
    # Start previous version
    docker run -d \
        --name ${CONTAINER_NAME} \
        --restart unless-stopped \
        -p ${SERVICE_PORT}:${SERVICE_PORT} \
        -e PORT=${SERVICE_PORT} \
        -e NODE_ENV=production \
        -e POSTGRES_HOST=${POSTGRES_HOST:-${POSTGRES_CONTAINER_NAME}} \
        -e POSTGRES_PORT=5432 \
        -e POSTGRES_USER=${POSTGRES_USER:-postgres} \
        -e POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
        -e POSTGRES_DATABASE=finflow_auth \
        -e POSTGRES_SSL=false \
        -e JWT_SECRET=${JWT_SECRET} \
        -e JWT_EXPIRES_IN=12h \
        -e CORS_ORIGIN=* \
        --network ${NETWORK_NAME} \
        ${previous_image}
    
    sleep 5
    
    if check_health; then
        print_info "Rollback successful!"
        return 0
    else
        print_error "Rollback failed!"
        return 1
    fi
}

# Main deployment function
main() {
    print_info "Starting deployment..."
    print_info "Image: ${DOCKER_IMAGE}:${DOCKER_TAG}"
    
    # Ensure network exists
    if ! docker network ls --format '{{.Name}}' | grep -q "^${NETWORK_NAME}$"; then
        print_info "Creating Docker network: ${NETWORK_NAME}"
        docker network create ${NETWORK_NAME} || true
    fi
    
    # Ensure PostgreSQL container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER_NAME}$"; then
        print_info "PostgreSQL container '${POSTGRES_CONTAINER_NAME}' is not running..."
        # Check if container exists but is stopped
        if docker ps -a --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER_NAME}$"; then
            print_info "PostgreSQL container exists but is stopped, starting it..."
            docker start ${POSTGRES_CONTAINER_NAME}
            
            # Connect to network if not already connected
            if ! docker network inspect ${NETWORK_NAME} --format '{{range .Containers}}{{.Name}}{{end}}' | grep -q "${POSTGRES_CONTAINER_NAME}"; then
                print_info "Connecting PostgreSQL container to network ${NETWORK_NAME}..."
                docker network connect ${NETWORK_NAME} ${POSTGRES_CONTAINER_NAME} || true
            fi
        else
            print_error "PostgreSQL container '${POSTGRES_CONTAINER_NAME}' not found!"
            print_error "Please ensure PostgreSQL container is running with name '${POSTGRES_CONTAINER_NAME}'"
            return 1
        fi
        
        print_info "Waiting for PostgreSQL to be ready..."
        sleep 5
        
        # Wait for PostgreSQL to be ready
        for i in {1..30}; do
            if docker exec ${POSTGRES_CONTAINER_NAME} pg_isready -U ${POSTGRES_USER:-postgres} > /dev/null 2>&1; then
                print_info "PostgreSQL is ready!"
                break
            fi
            print_warn "Waiting for PostgreSQL... ($i/30)"
            sleep 2
        done
        
        # Test password authentication
        print_info "Testing PostgreSQL password authentication..."
        print_info "Testing with user: ${POSTGRES_USER:-postgres}, database: ${POSTGRES_DATABASE:-finflow_auth}"
        if ! docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" ${POSTGRES_CONTAINER_NAME} psql -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DATABASE:-finflow_auth} -c "SELECT 1;" > /dev/null 2>&1; then
            print_error "Password authentication failed!"
            print_error "The PostgreSQL password in Jenkins credentials does not match the container password."
            print_error ""
            print_error "To fix this:"
            print_error "1. Check the container's password: docker inspect ${POSTGRES_CONTAINER_NAME} | grep POSTGRES_PASSWORD"
            print_error "2. Update Jenkins 'postgres-password' credential to match"
            print_error ""
            print_error "Current password being used: (from Jenkins credentials)"
            return 1
        fi
        print_info "PostgreSQL password authentication successful!"
    else
        print_info "PostgreSQL container '${POSTGRES_CONTAINER_NAME}' is already running"
        
        # Ensure PostgreSQL is connected to the network
        if ! docker network inspect ${NETWORK_NAME} --format '{{range .Containers}}{{.Name}}{{end}}' | grep -q "${POSTGRES_CONTAINER_NAME}"; then
            print_info "Connecting PostgreSQL container to network ${NETWORK_NAME}..."
            docker network connect ${NETWORK_NAME} ${POSTGRES_CONTAINER_NAME} || true
        fi
        
        # Test password authentication
        print_info "Testing PostgreSQL password authentication..."
        print_info "Testing with user: ${POSTGRES_USER:-postgres}, database: ${POSTGRES_DATABASE:-finflow_auth}"
        if ! docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" ${POSTGRES_CONTAINER_NAME} psql -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DATABASE:-finflow_auth} -c "SELECT 1;" > /dev/null 2>&1; then
            print_error "Password authentication failed!"
            print_error "The PostgreSQL password in Jenkins credentials does not match the container password."
            print_error ""
            print_error "To fix this:"
            print_error "1. Check the container's password: docker inspect ${POSTGRES_CONTAINER_NAME} | grep POSTGRES_PASSWORD"
            print_error "2. Update Jenkins 'postgres-password' credential to match"
            print_error ""
            print_error "Current password being used: (from Jenkins credentials)"
            return 1
        fi
        print_info "PostgreSQL password authentication successful!"
    fi
    
    # Pull latest image
    print_info "Pulling Docker image..."
    docker pull ${DOCKER_IMAGE}:${DOCKER_TAG}
    
    # Stop existing container if running
    if is_container_running; then
        print_info "Stopping existing container..."
        docker stop ${CONTAINER_NAME}
        docker rm ${CONTAINER_NAME}
    fi
    
    # Start new container
    print_info "Starting new container..."
    print_info "Using PostgreSQL connection: ${POSTGRES_USER:-postgres}@${POSTGRES_HOST:-${POSTGRES_CONTAINER_NAME}}:${POSTGRES_PORT:-5432}/${POSTGRES_DATABASE:-finflow_auth}"
    docker run -d \
        --name ${CONTAINER_NAME} \
        --restart unless-stopped \
        -p ${SERVICE_PORT}:${SERVICE_PORT} \
        -e PORT=${SERVICE_PORT} \
        -e NODE_ENV=production \
        -e POSTGRES_HOST=${POSTGRES_HOST:-${POSTGRES_CONTAINER_NAME}} \
        -e POSTGRES_PORT=${POSTGRES_PORT:-5432} \
        -e POSTGRES_USER=${POSTGRES_USER:-postgres} \
        -e POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
        -e POSTGRES_DATABASE=${POSTGRES_DATABASE:-finflow_auth} \
        -e POSTGRES_SSL=false \
        -e JWT_SECRET=${JWT_SECRET} \
        -e JWT_EXPIRES_IN=${JWT_EXPIRES_IN:-12h} \
        -e CORS_ORIGIN=${CORS_ORIGIN:-*} \
        --network ${NETWORK_NAME} \
        ${DOCKER_IMAGE}:${DOCKER_TAG}
    
    # Wait for container to start
    print_info "Waiting for container to start..."
    sleep 5
    
    # Debug: Check environment variables in container
    print_info "Checking environment variables in container..."
    docker exec ${CONTAINER_NAME} env | grep -E "POSTGRES_|JWT_" || true
    
    # Health check
    if check_health; then
        print_info "Deployment successful!"
        
        # Show container status
        docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        
        exit 0
    else
        print_error "Deployment failed! Service is not healthy."
        
        # Show container logs
        print_info "Container logs:"
        docker logs --tail 50 ${CONTAINER_NAME} || true
        
        # Attempt rollback
        if rollback; then
            print_info "Rollback successful"
            exit 1
        else
            print_error "Rollback failed. Manual intervention required."
            exit 1
        fi
    fi
}

# Run main function
main "$@"
