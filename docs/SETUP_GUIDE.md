# BusPulse – Developer Setup & Execution Guide

This document provides complete instructions to set up, configure, run, and test the **BusPulse** platform on your local machine.

---

## 1. System Prerequisites

Ensure you have the following installed:
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **Python**: v3.10 or higher (for YOLOv8 passenger counting)
- **MongoDB**: A running local MongoDB instance or a cloud MongoDB Atlas connection URI
- **Git**: Installed and configured on your path

---

## 2. Step-by-Step Installation

### Step 2.1 – Clone Repository & Navigate
```bash
git clone https://github.com/bhushan7278/buspulse.git
cd buspulse
```

---

### Step 2.2 – Backend Configuration & Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Configure the environment file:**
   Copy the example environment template:
   ```bash
   # On Windows PowerShell:
   Copy-Item .env.example .env

   # On Linux/macOS:
   cp .env.example .env
   ```

4. **Edit `backend/.env` with your settings:**
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   FRONTEND_URL=http://localhost:5173

   # Configurable public tracking URL for mobile WhatsApp GPS links:
   # For local Wi-Fi development, use your PC's LAN IP (e.g., http://192.168.1.100:5173)
   # For production, use your deployed domain or HTTPS ngrok tunnel
   PUBLIC_TRACKING_URL=http://localhost:5173
   NODE_ENV=development

   # JWT Secret Key
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRES_IN=1h

   # Gmail SMTP for OTP dispatch (optional in development if testing with mock challenges)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_16_character_gmail_app_password
   ADMIN_REGISTRATION_EMAIL=your_email@gmail.com
   ADMIN_APPROVAL_EMAIL=your_approval_email@example.com

   # Admin Registration Policy
   ALLOW_ADMIN_REGISTRATION=false
   ```

---

### Step 2.3 – Python & YOLOv8 ML Setup

The backend utilizes Ultralytics YOLOv8 for passenger detection.

1. **Verify or create a Python virtual environment:**
   ```bash
   # Still inside backend/ (or in backend/ml/)
   python -m venv venv

   # Activate virtual environment:
   # Windows:
   venv\Scripts\activate
   # Linux/macOS:
   source venv/bin/activate
   ```

2. **Install required Python packages:**
   ```bash
   pip install ultralytics opencv-python numpy
   ```

3. **Verify model weights:**
   Confirm that `backend/ml/yolov8s.pt` exists (approximately 22.5 MB). The model weights are tracked directly in the repository.

---

### Step 2.4 – Frontend Configuration & Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd ../frontend
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Configure the environment file:**
   ```bash
   # Windows PowerShell:
   Copy-Item .env.example .env

   # Linux/macOS:
   cp .env.example .env
   ```

4. **Edit `frontend/.env`:**
   ```env
   # In development, you can use your LAN IP to allow smartphones on the same Wi-Fi to track
   VITE_PUBLIC_TRACKING_URL=http://localhost:5173
   VITE_API_URL=http://localhost:5000
   ```

---

## 3. Running the Application

### 3.1 Start the Backend Server
Open a terminal in the `backend/` directory:
```bash
cd backend
npm run dev
# Or for direct Node.js execution:
npm start
```
The server will initialize on port 5000:
```
MongoDB connected successfully
BusPulse server running on:
   - Local:   http://localhost:5000
   - Network: http://<LAN_IP>:5000
```

### 3.2 Start the Frontend Development Server
Open a second terminal in the `frontend/` directory:
```bash
cd frontend
npm run dev
```
The Vite development server will open:
```
  VITE v8.1.4  ready in 250 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://<LAN_IP>:5173/
```

Access the operator dashboard in your browser at `http://localhost:5173`.

---

## 4. Building for Production

To produce an optimized production bundle of the React frontend:
```bash
cd frontend
npm run build
```
The output will be generated in `frontend/dist/`.

---

## 5. Running Automated Integration Tests

All backend test suites are located in `backend/tests/` and run against the configured MongoDB database:

```bash
cd backend

# 1. Depot Bus Management Suite (Registration, soft-deletion, conflict prevention)
node tests/test_depot_bus_management.js

# 2. Complete Lifecycle Suite (Dispatch, GPS link generation, completion, reconciliation)
node tests/test_complete_lifecycle.js

# 3. Updated Features Suite (Depot-wide driver attendance, search, ETA & 8-scenario extra bus matrix)
node tests/test_updated_features.js

# 4. Auth & Regression Suite
node tests/test_auth_and_regression.js
```

---

## 6. Mobile GPS Tracking over Local Wi-Fi

To test the mobile driver tracking workflow with a real physical smartphone:
1. Ensure both your computer and your smartphone are connected to the same Wi-Fi network.
2. Find your computer's local IP address (`ipconfig` on Windows, `ifconfig` on Linux/macOS).
3. In `backend/.env`, set:
   ```env
   PUBLIC_TRACKING_URL=http://<YOUR_LAN_IP>:5173
   ```
4. In `frontend/.env`, set:
   ```env
   VITE_PUBLIC_TRACKING_URL=http://<YOUR_LAN_IP>:5173
   VITE_API_URL=http://<YOUR_LAN_IP>:5000
   ```
5. Restart both backend and frontend servers.
6. When dispatching a trip from `http://<YOUR_LAN_IP>:5173/goes-on-route`, click "Share via WhatsApp" or scan the generated QR code with your phone.
7. Open the link on the phone to transmit live GPS coordinates directly to the depot dashboard map.
