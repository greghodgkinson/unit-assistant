# Unit Assistant Application

A modern React-based learning assistant application designed to help students track their progress through educational units and tasks. Built with TypeScript, Tailwind CSS, and featuring a clean, intuitive interface for managing learning outcomes and assignments.

## Features

- **Unit Overview**: Comprehensive view of learning objectives and tasks
- **Progress Dashboard**: Visual tracking of completion status and metrics
- **Task Management**: Individual task views with acceptance criteria and feedback
- **Answer Tracking**: Version control and progress monitoring for student responses
- **Responsive Design**: Works seamlessly across desktop and mobile devices

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Containerization**: Docker with Nginx

## Local Development

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd unit-assistant
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Docker Deployment

### Building the Docker Image

To build the Docker image locally:

```bash
docker build -t unit-assistant .
```

### Running the Container

To run the application in a Docker container:

```bash
docker run -d -p 8080:80 --name unit-assistant-app unit-assistant
```

The application will be available at `http://localhost:8080`

### Docker Compose (Optional)

Create a `docker-compose.yml` file for easier management:

```yaml
version: '3.8'
services:
  learning-assistant:
    build: .
    ports:
      - "8080:80"
    restart: unless-stopped
```

Then run:
```bash
docker-compose up -d
```

### Deployment to Production

#### Option 1: Docker Hub

1. Tag your image:
```bash
docker tag learning-assistant your-dockerhub-username/learning-assistant:latest
```

2. Push to Docker Hub:
```bash
docker push your-dockerhub-username/learning-assistant:latest
```

3. Deploy on any server with Docker:
```bash
docker pull your-dockerhub-username/learning-assistant:latest
docker run -d -p 80:80 --name learning-assistant your-dockerhub-username/learning-assistant:latest
```

#### Option 2: Cloud Platforms

**AWS ECS/Fargate:**
- Push image to Amazon ECR
- Create ECS task definition
- Deploy using ECS service

**Google Cloud Run:**
```bash
gcloud run deploy learning-assistant --image gcr.io/PROJECT-ID/learning-assistant --platform managed
```

**Azure Container Instances:**
```bash
az container create --resource-group myResourceGroup --name learning-assistant --image your-registry/learning-assistant:latest --dns-name-label learning-assistant --ports 80
```

#### Option 3: Kubernetes

Create deployment and service manifests:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: learning-assistant
spec:
  replicas: 3
  selector:
    matchLabels:
      app: learning-assistant
  template:
    metadata:
      labels:
        app: learning-assistant
    spec:
      containers:
      - name: learning-assistant
        image: your-registry/learning-assistant:latest
        ports:
        - containerPort: 80

---
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: learning-assistant-service
spec:
  selector:
    app: learning-assistant
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: LoadBalancer
```

Deploy with:
```bash
kubectl apply -f deployment.yaml
```

## Environment Variables

The application uses local storage for data persistence. For production deployments, consider:

- Adding environment-specific configurations
- Implementing backend API integration
- Setting up proper authentication
- Configuring analytics and monitoring

## Performance Optimization

The Docker image includes:
- Multi-stage build for smaller image size
- Nginx with gzip compression
- Static asset caching
- Security headers
- Optimized for production serving

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the repository or contact the development team.