# Passenger Count Integration with YOLOv8 - TODO

## Plan Breakdown & Progress Tracking

### 1. Setup Python Environment [PENDING]
   - cd smart-bus-system/server
   - python -m venv venv
   - venv\Scripts\activate (Windows)
   - pip install ultralytics opencv-python numpy

### 2. Update yolo_stub.py to YOLOv8 [✅ DONE]
   - Replace MediaPipe with Ultralytics YOLO('yolov8s.pt')
   - CLI: read 4 image paths from sys.argv
   - Logic: for each img → decode → model(img) → count CLS=0 boxes → output MAX count
   - Remove old cache/hash

### 3. Add Location Endpoints to server/index.js [✅ DONE]
   - POST /update-location: {lat, lng, speed} → store in Location model (add tripId if avail)
   - GET /get-location: return latest active location

### 4. Test Integration [PENDING]
   - npm start (server)
   - POST /extra-bus/evaluate with 4 images → verify accurate max passenger count
   - Test location endpoints

### 5. Optional Frontend [PENDING]
   - Update src/api.js if needed for new calls

**Next Step: Setup venv & deps → confirm before edits.**
