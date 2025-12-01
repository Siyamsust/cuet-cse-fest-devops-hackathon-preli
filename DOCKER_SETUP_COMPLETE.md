# Docker Setup - Complete ✅

## Status
✅ **All services running and healthy**

## Services Running
1. **MongoDB** (ecommerce-mongo-dev)
   - Status: Healthy
   - Port: 27017 (internal + development)
   - Database: ecommerce
   - Authentication: Enabled (admin:admin123)

2. **Backend** (ecommerce-backend-dev)
   - Status: Healthy
   - Port: 3847 (internal only, not publicly exposed)
   - Runtime: Node.js 20 + TypeScript (tsx watch)
   - Hot Reload: Enabled
   - Connected to: MongoDB ✓

3. **Gateway** (ecommerce-gateway-dev)
   - Status: Healthy  
   - Port: 5921 (publicly exposed)
   - Runtime: Node.js 20 + Express
   - Routes: /api/* to backend:3847
   - Hot Reload: Enabled

## Network Architecture
```
[PUBLIC]
   ↓
[Gateway:5921] (publicly exposed)
   ↓ (internal network)
[Backend:3847] (internal only)
   ↓ (internal network)
[MongoDB:27017] (internal only)
```

## How to Use

### Start Services
```powershell
cd "d:\cuet hackathon\cuet-cse-fest-devops-hackathon-preli"
docker-compose -f docker/compose.development.yaml --env-file .env up -d
```

### Stop Services
```powershell
docker-compose -f docker/compose.development.yaml down
```

### View Logs
```powershell
# All services
docker-compose -f docker/compose.development.yaml logs -f

# Specific service
docker logs ecommerce-backend-dev -f
docker logs ecommerce-gateway-dev -f
docker logs ecommerce-mongo-dev -f
```

### Test Endpoints

#### Gateway Health (Public)
```
GET http://localhost:5921/health
Response: {"status":"ok","timestamp":"...","service":"gateway"}
```

#### Backend Health (Through Gateway)
```
GET http://localhost:5921/api/health
Response: {"ok":true}
```

#### Products Endpoint (Through Gateway)
```
GET http://localhost:5921/api/products
Response: [] (empty array - no products yet)

POST http://localhost:5921/api/products
Body: {"name":"Product Name","price":99.99}
```

#### Backend Direct Access (Should FAIL - Not Exposed)
```
GET http://localhost:3847/api/health
Result: ❌ Connection refused (correct - internal only)
```

## Environment Variables (.env)
```
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=admin123
MONGO_URI=mongodb://admin:admin123@mongo:27017/ecommerce?authSource=admin
MONGO_DATABASE=ecommerce
BACKEND_PORT=3847
GATEWAY_PORT=5921
NODE_ENV=development
```

## Data Persistence
- MongoDB data stored in Docker named volume: `docker_mongo_data_dev`
- Data persists across container restarts
- Volume automatically created by Docker Compose

## Troubleshooting

### Services won't start
1. Remove volumes: `docker-compose -f docker/compose.development.yaml down -v`
2. Rebuild images: `docker-compose -f docker/compose.development.yaml build --no-cache`
3. Start again: `docker-compose -f docker/compose.development.yaml up -d`

### Backend can't connect to MongoDB
1. Check MongoDB is healthy: `docker logs ecommerce-mongo-dev | tail -20`
2. Verify environment variables: `docker exec ecommerce-backend-dev printenv | grep MONGO`
3. Check network: `docker network inspect docker_ecommerce_network`

### Port conflicts
- If ports 5921, 3847, or 27017 are already in use, modify `docker/compose.development.yaml`
- Change port mappings: `"5922:5921"` (host:container)

## Files Created/Modified
- ✅ `.env` - Environment variables
- ✅ `backend/Dockerfile` - Production build
- ✅ `backend/Dockerfile.dev` - Development build with hot-reload
- ✅ `backend/src/config/envConfig.ts` - Fixed configuration
- ✅ `backend/src/config/db.ts` - MongoDB connection
- ✅ `gateway/Dockerfile` - Production build
- ✅ `gateway/Dockerfile.dev` - Development build
- ✅ `gateway/src/gateway.js` - Fixed proxy logic
- ✅ `docker/compose.development.yaml` - Development orchestration
- ✅ `docker/compose.production.yaml` - Production orchestration

## Production Deployment
Use `docker/compose.production.yaml` for production with:
- Optimized images (no hot-reload)
- Automatic restart policies
- Structured logging
- Health checks (30s intervals)

## Next Steps
1. ✅ Test all endpoints (see "Test Endpoints" section above)
2. ✅ Create sample products via API
3. ✅ Verify data persists across restarts: `docker-compose down && docker-compose up -d`
4. Review production compose file for deployment
