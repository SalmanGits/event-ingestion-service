## Getting Started

### Cloning the Repository

To get started, clone the repository:

```bash
https://github.com/SalmanGits/event-ingestion-service.git
cd event-ingestion-service
```

---

### Environment Variables

Create a `.env` file in the root of the project to configure environment variables:

```env
# Server
PORT=3000

# MongoDB connection URI
URI=mongodb://localhost:27017/eventdb

# Redis connection URI
# Local example: redis://localhost:6379
# Docker link example: redis://bullmq-redis:6379
# Remote example: redis://<user>:<pass>@<host>:<port>
REDIS_URL=redis://localhost:6379

# Event ingestion limits
MAX_PER_REQUEST=1000
BATCH_CHUNK_SIZE=1000


```
---

### Running Locally

To run the application locally:

Install dependencies:

   ```bash
   pnpm install
   ```

Start the development server:

   ```bash
   pnpm run dev
   ```

The application will start on `http://localhost:3000` (or the port specified in your `.env` file).

---

### Running with Docker

You can also run the application using Docker. Follow these steps:

### Build the Docker Image

```bash
docker build -t your-app-name .
```
### Run Redis

```bash
docker run -d --name bullmq-redis -p 6379:6379 redis

```

### Run the Docker Image

If you are using a local Redis instance (via Docker), link the Redis container to your app image:

```bash
docker run -d -p 3000:3000 --name container-name --link bullmq-redis -e REDIS_HOST=bullmq-redis image-name

```

If you are using a remote Redis instance (via URL), you don’t need to link the Redis container. Just pass the Redis URL in the `.env` file or as an environment variable:

```bash
docker run -d -p 3000:3000 --name your-app-name app-image
```

---

### Seeding Fake Events 

Run locally:

```bash
pnpm run seed:events

```
Or inside Docker:
```bash
docker exec -it event-app pnpm run seed:events

```

---


## Postman Collection & API Documentation

You can import the Postman collection to test the APIs directly:

- [Download Postman Collection](https://drive.google.com/file/d/1TnRTTp7i80KedCesMCLaG2dj__Zct1Cp/view?usp=sharing)

Or view the interactive API documentation here:

- [API Documentation](https://documenter.getpostman.com/view/24310390/2sB3BEnA6y#ce7796e5-5a83-4747-ae15-023dac47ece7) 

---
