# Auth Service Deployment Guide

This guide covers deploying the Finflow Auth Service to AWS EC2 using Docker and Jenkins CI/CD.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Docker Setup](#docker-setup)
- [AWS EC2 Setup](#aws-ec2-setup)
- [Jenkins Configuration](#jenkins-configuration)
- [Deployment Process](#deployment-process)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Docker and Docker Compose installed locally
- AWS account with EC2 instance running
- Jenkins server installed and running
- Docker Hub account (or AWS ECR)
- Git repository access
- SSH access to EC2 instance

## Local Development Setup

### 1. Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Update `.env.local` with your local configuration.

### 2. Run with Docker Compose

Start PostgreSQL and the auth service:

```bash
docker-compose up -d
```

The service will be available at `http://localhost:3001`

- API Documentation: `http://localhost:3001/api`
- Health Check: `http://localhost:3001/health`

### 3. Database Migration

The database migration runs automatically when PostgreSQL starts for the first time. The migration file is located at:
`src/core/database/migrations/001_create_users_table.sql`

To manually run migrations:

```bash
docker exec -i finflow-auth-postgres psql -U postgres -d finflow_auth < src/core/database/migrations/001_create_users_table.sql
```

## Docker Setup

### Building the Docker Image

Build the image locally:

```bash
docker build -t auth-service:latest .
```

### Testing the Image

Run the container:

```bash
docker run -d \
  --name auth-service \
  -p 3001:3001 \
  -e POSTGRES_HOST=your-postgres-host \
  -e POSTGRES_PASSWORD=your-password \
  -e JWT_SECRET=your-secret \
  auth-service:latest
```

## AWS EC2 Setup

### 1. Launch EC2 Instance

- **AMI**: Ubuntu 22.04 LTS or Amazon Linux 2023
- **Instance Type**: t2.micro (minimum) or t3.small (recommended)
- **Security Group**: Allow ports 22 (SSH), 3001 (Auth Service)
- **Storage**: 20GB minimum

### 2. Install Docker on EC2

SSH into your EC2 instance and install Docker:

```bash
# For Ubuntu
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Log out and back in for group changes to take effect
```

### 3. Install PostgreSQL (Docker Container)

Create a directory for PostgreSQL:

```bash
mkdir -p /opt/postgres-data
```

Run PostgreSQL container:

```bash
docker run -d \
  --name finflow-auth-postgres \
  --restart unless-stopped \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your-secure-password \
  -e POSTGRES_DB=finflow_auth \
  -v /opt/postgres-data:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:16-alpine
```

### 4. Create Docker Network

```bash
docker network create auth-network
docker network connect auth-network finflow-auth-postgres
```

### 5. Set Up Deployment Directory

```bash
sudo mkdir -p /opt/auth-service
sudo chown $USER:$USER /opt/auth-service
```

## Jenkins Configuration

### 1. Install Required Plugins

Install the following Jenkins plugins:

- **Docker Pipeline** - For Docker operations
- **SSH Pipeline Steps** - For SSH operations
- **Credentials Binding** - For managing secrets
- **Git** - For Git operations

### 2. Configure Jenkins Credentials

Go to **Jenkins → Manage Jenkins → Credentials → System → Global credentials**

Add the following credentials:

#### Docker Hub Credentials

- **Kind**: Username with password
- **ID**: `dockerhub-credentials`
- **Username**: Your Docker Hub username
- **Password**: Your Docker Hub password or access token

#### EC2 SSH Key

- **Kind**: SSH Username with private key
- **ID**: `ec2-ssh-key`
- **Username**: `ubuntu` (or `ec2-user` for Amazon Linux)
- **Private Key**: Your EC2 SSH private key

#### EC2 Host

- **Kind**: Secret text
- **ID**: `ec2-host`
- **Secret**: Your EC2 public IP or domain name

#### EC2 User

- **Kind**: Secret text
- **ID**: `ec2-user`
- **Secret**: `ubuntu` (or `ec2-user` for Amazon Linux)

#### JWT Secret

- **Kind**: Secret text
- **ID**: `jwt-secret`
- **Secret**: Your production JWT secret (generate with `openssl rand -base64 32`)

#### PostgreSQL Password

- **Kind**: Secret text
- **ID**: `postgres-password`
- **Secret**: Your PostgreSQL password

### 3. Create Jenkins Pipeline Job

1. Go to **Jenkins → New Item**
2. Enter job name: `auth-service-deploy`
3. Select **Pipeline**
4. Click **OK**
5. In **Pipeline** section:
   - **Definition**: Pipeline script from SCM
   - **SCM**: Git
   - **Repository URL**: Your Git repository URL
   - **Credentials**: Add your Git credentials if needed
   - **Branch Specifier**: `*/main` (or your main branch)
   - **Script Path**: `backend/services/auth-service/Jenkinsfile`
6. Click **Save**

### 4. Update Jenkinsfile

Before running the pipeline, update the `Jenkinsfile`:

1. Replace `admin` with your Docker Hub username
2. Verify all credential IDs match your Jenkins credentials

### 5. Configure Webhook (Optional)

To trigger builds automatically on Git push:

1. In your Git repository (GitHub/GitLab), go to **Settings → Webhooks**
2. Add webhook URL: `http://your-jenkins-url/github-webhook/`
3. Select events: **Push events**
4. Save webhook

## Deployment Process

### Manual Deployment via Jenkins

1. Go to your Jenkins job: `auth-service-deploy`
2. Click **Build Now**
3. Monitor the build progress
4. Check console output for any errors

### Manual Deployment via SSH

SSH into your EC2 instance and run:

```bash
cd /opt/auth-service

# Set environment variables
export DOCKER_IMAGE=admin
export DOCKER_TAG=latest
export POSTGRES_PASSWORD=your-postgres-password
export JWT_SECRET=your-jwt-secret

# Run deployment script
./scripts/deploy.sh
```

### Verify Deployment

Check if the service is running:

```bash
# On EC2
curl http://localhost:3001/health

# From your local machine
curl http://your-ec2-ip:3001/health
```

Check container logs:

```bash
docker logs finflow-auth-service
```

## CI/CD Pipeline Flow

1. **Checkout**: Jenkins checks out code from Git repository
2. **Build**: Docker image is built from Dockerfile
3. **Test**: Unit tests are run (if available)
4. **Push**: Image is pushed to Docker Hub with tags
5. **Deploy**: Jenkins SSHs to EC2 and runs deployment script
6. **Health Check**: Service health is verified

## Environment Variables

### Production Environment Variables

Create `.env.production` on EC2 (or use Jenkins secrets):

```bash
PORT=3001
NODE_ENV=production
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DATABASE=finflow_auth
JWT_SECRET=your-strong-jwt-secret
JWT_EXPIRES_IN=12h
CORS_ORIGIN=*
```

## Troubleshooting

### Container Won't Start

1. Check container logs:

   ```bash
   docker logs finflow-auth-service
   ```

2. Verify environment variables:

   ```bash
   docker inspect finflow-auth-service | grep -A 20 Env
   ```

3. Check if PostgreSQL is accessible:
   ```bash
   docker exec finflow-auth-postgres psql -U postgres -d finflow_auth -c "SELECT 1;"
   ```

### Health Check Fails

1. Verify service is listening:

   ```bash
   docker exec finflow-auth-service netstat -tlnp | grep 3001
   ```

2. Check service logs for errors:

   ```bash
   docker logs --tail 100 finflow-auth-service
   ```

3. Test health endpoint manually:
   ```bash
   curl -v http://localhost:3001/health
   ```

### Database Connection Issues

1. Verify PostgreSQL container is running:

   ```bash
   docker ps | grep postgres
   ```

2. Check network connectivity:

   ```bash
   docker network inspect auth-network
   ```

3. Test database connection:
   ```bash
   docker exec finflow-auth-postgres psql -U postgres -d finflow_auth -c "\dt"
   ```

### Jenkins Pipeline Fails

1. Check Jenkins console output for specific error
2. Verify all credentials are configured correctly
3. Ensure EC2 instance is accessible from Jenkins server
4. Check Docker Hub credentials are valid
5. Verify SSH key has correct permissions

### Rollback

If deployment fails, the script attempts automatic rollback. To manually rollback:

```bash
# Stop current container
docker stop finflow-auth-service
docker rm finflow-auth-service

# Start previous version
docker run -d \
  --name finflow-auth-service \
  --restart unless-stopped \
  -p 3001:3001 \
  -e POSTGRES_HOST=postgres \
  -e POSTGRES_PASSWORD=your-password \
  -e JWT_SECRET=your-secret \
  --network auth-network \
  admin:previous-tag
```

## Security Best Practices

1. **Never commit secrets**: Use Jenkins credentials or environment variables
2. **Use strong passwords**: Generate secure passwords for PostgreSQL and JWT
3. **Limit SSH access**: Restrict EC2 security group to specific IPs
4. **Use HTTPS**: Set up SSL/TLS for production (consider using a load balancer)
5. **Regular updates**: Keep Docker images and EC2 instance updated
6. **Monitor logs**: Set up log aggregation and monitoring
7. **Backup database**: Regularly backup PostgreSQL data

## Next Steps

- Set up domain name and SSL certificate
- Configure load balancer for high availability
- Set up monitoring and alerting (CloudWatch, Datadog, etc.)
- Implement blue-green deployments
- Set up database backups
- Configure log rotation
- Add performance monitoring

## Support

For issues or questions, check:

- Service logs: `docker logs finflow-auth-service`
- Health endpoint: `http://your-host:3001/health`
- API documentation: `http://your-host:3001/api`
