# BusPulse – Project Structure Documentation

This document describes the directory organization, component boundaries, and module responsibilities of the **BusPulse** repository.

The repository is organized into a clean multi-tier structure separating the React operator/admin interface (`frontend/`), the Node.js/Express REST API and Computer Vision engine (`backend/`), and comprehensive system documentation (`docs/`).

---

## 1. Directory Tree Overview

```
BusPulse/
│
├── backend/                                <- Node.js Express REST API & Computer Vision
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                       <- Mongoose connection initialization
│   │   ├── controllers/                    <- Controller layer (business operations & endpoints)
│   │   │   ├── authController.js           <- Registration, OTP, login, JWT validation
│   │   │   ├── busController.js            <- Bus registry, status updates, depot management
│   │   │   ├── driverController.js         <- Driver attendance, status, search
│   │   │   ├── extraBusController.js       <- YOLO passenger evaluation & decision matrix
│   │   │   ├── locationController.js       <- GPS telemetry updates & reverse geocoding
│   │   │   ├── routeController.js          <- Static route definitions & stops
│   │   │   └── tripController.js           <- Trip dispatch, completion, active tracking
│   │   ├── middleware/
│   │   │   └── authMiddleware.js           <- JWT authentication & route protection
│   │   ├── models/                         <- Mongoose Data Models (MongoDB schemas)
│   │   │   ├── Admin.js                    <- Operator/admin accounts & role
│   │   │   ├── Attendance.js               <- Driver daily check-in records
│   │   │   ├── Bus.js                      <- Bus inventory & live state
│   │   │   ├── Driver.js                   <- Driver profiles, phone & assignment state
│   │   │   ├── Location.js                 <- GPS telemetry records (lat, lng, speed, heading)
│   │   │   ├── OtpChallenge.js             <- Registration email OTP verification
│   │   │   └── Trip.js                     <- Journey lifecycle records (active/completed)
│   │   ├── routes/                         <- Express Routing Layer
│   │   │   ├── authRoutes.js               <- /auth/*
│   │   │   ├── busRoutes.js                <- /buses/*
│   │   │   ├── driverRoutes.js             <- /drivers/* & /attendance/*
│   │   │   ├── extraBusRoutes.js           <- /extra-bus/*
│   │   │   ├── locationRoutes.js           <- /update-location & /get-location
│   │   │   ├── routeRoutes.js              <- /routes/*
│   │   │   └── tripRoutes.js               <- /trips/*, /start-trip, /complete-trip
│   │   ├── utils/                          <- Helper utilities & system constants
│   │   │   ├── emailService.js             <- Nodemailer SMTP transport for OTP
│   │   │   ├── network.js                  <- Dynamic local LAN IP resolution
│   │   │   ├── routeConfig.js              <- Route geometry, stops, ETAs & thresholds
│   │   │   └── seedData.js                 <- Initial depot buses & drivers
│   │   ├── index.js                        <- Backend server entry point
│   │
│   ├── ml/                                 <- Machine Learning & Computer Vision
│   │   ├── yolo_stub.py                    <- Python CLI wrapper for YOLOv8 detection
│   │   ├── yolov8s.pt                      <- Pre-trained Ultralytics YOLOv8 weights (22MB)
│   │   └── yolo_cache.pkl                  <- Model runtime cache
│   │
│   ├── scripts/                            <- Administrative & verification scripts
│   │   ├── reset_admin_and_reconcile.js    <- Admin reset & state repair utility
│   │   ├── run_all_section_tests.js        <- Complete multi-section integration runner
│   │   ├── test_checkout_and_tracking.js   <- Checkout & tracking verification suite
│   │   └── test_md_approval_suite.js       <- Admin registration & approval test suite
│   │
│   ├── .env                                <- Local backend secrets (gitignored)
│   ├── .env.example                        <- Safe backend environment template
│   ├── .gitignore                          <- Backend git exclusion rules
│   ├── package.json                        <- Backend npm package definition
│   └── package-lock.json                   <- Backend dependency lockfile
│
├── frontend/                               <- React 19 + Vite Admin Dashboard
│   ├── public/                             <- Static public assets
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── src/
│   │   ├── assets/                         <- Static images and icons
│   │   │   ├── hero.png
│   │   │   ├── react.svg
│   │   │   └── vite.svg
│   │   ├── components/                     <- Reusable React UI components
│   │   │   ├── ProtectedRoute.jsx          <- Route guard requiring JWT login
│   │   │   ├── PublicOnlyRoute.jsx         <- Route guard redirecting authenticated users
│   │   │   ├── ReportingSubNav.jsx         <- Sub-navigation for reporting pages
│   │   │   └── TopNav.jsx                  <- Global header bar with auth state
│   │   ├── context/                        <- Application Contexts
│   │   │   └── AuthContext.jsx             <- Admin login state, token persistence & logout
│   │   ├── pages/                          <- Page Views
│   │   │   ├── CameOnRoute.jsx             <- Driver attendance check-in page
│   │   │   ├── CheckOut.jsx                <- Driver check-out page
│   │   │   ├── Dashboard.jsx               <- Main overview metrics & fleet dashboard
│   │   │   ├── DepotBuses.jsx              <- Depot bus registry & management
│   │   │   ├── ExtraBus.jsx                <- YOLO crowd image upload & evaluation trigger
│   │   │   ├── ExtraBusResult.jsx          <- Decision matrix outcome & dispatch button
│   │   │   ├── GoesOnRoute.jsx             <- Trip dispatch & WhatsApp link generation
│   │   │   ├── Login.jsx                   <- Operator/Admin login
│   │   │   ├── NotFound.jsx                <- 404 fallback page
│   │   │   ├── Register.jsx                <- Operator registration with email OTP
│   │   │   ├── Reporting.jsx               <- Journey logs, driver status & reports
│   │   │   ├── TrackBus.jsx                <- Depot-wide live route tracking with Leaflet
│   │   │   └── Tracking.jsx                <- Mobile driver tracking view (WhatsApp link target)
│   │   ├── utils/                          <- Frontend helper utilities
│   │   │   ├── routeConfig.js              <- Route coordinates & distance calculation
│   │   │   └── whatsapp.js                 <- WhatsApp message URL encoder
│   │   ├── api.js                          <- Axios/fetch API configuration
│   │   ├── App.css                         <- Global styling overrides
│   │   ├── App.jsx                         <- Application routing tree
│   │   ├── index.css                       <- Tailwind CSS entry point
│   │   ├── main.jsx                        <- React root DOM mount
│   │   └── routes.js                       <- Route constant mappings
│   │
│   ├── .env                                <- Local frontend secrets (gitignored)
│   ├── .env.example                        <- Safe frontend environment template
│   ├── .gitignore                          <- Frontend git exclusion rules
│   ├── eslint.config.js                    <- ESLint configuration
│   ├── index.html                          <- Vite HTML entry point
│   ├── package.json                        <- Frontend npm package definition
│   ├── package-lock.json                   <- Frontend dependency lockfile
│   ├── postcss.config.js                   <- PostCSS plugin configuration
│   ├── tailwind.config.js                  <- Tailwind CSS styling configuration
│   └── vite.config.js                      <- Vite bundler configuration
│
├── docs/                                   <- System Documentation
│   ├── ARCHITECTURE.md                     <- Architecture, data flow & subsystem design
│   ├── PROJECT_STRUCTURE.md                <- Repository organization (this document)
│   └── SETUP_GUIDE.md                      <- Step-by-step developer setup & execution guide
│
├── .gitignore                              <- Root-level repository git exclusion rules
├── LICENSE                                 <- MIT Open Source License
├── README.md                               <- Professional GitHub repository documentation
└── TODO.md                                 <- Development notes & feature tracking
```

---

## 2. Component Boundaries and Responsibilities

### Frontend (`frontend/`)
- **Technology**: React 19, Vite, Tailwind CSS, Lucide React, Leaflet, Axios.
- **Audience**: Exclusively depot administrators and fleet dispatchers (B2E system).
- **Security**: JWT stored in `localStorage` managed via `AuthContext`, with `ProtectedRoute` wrapping internal operations.
- **Key Views**:
  - `Dashboard`: Live overview of fleet utilization, active trips, and driver readiness.
  - `DepotBuses`: CRUD management for depot buses with conflict guards preventing deletion of buses on active trips.
  - `CameOnRoute` / `CheckOut`: Driver daily attendance check-in and checkout.
  - `GoesOnRoute`: Dispatching journeys and generating driver WhatsApp dispatch links.
  - `ExtraBus` / `ExtraBusResult`: Multi-angle bus stop camera image upload, YOLO passenger detection evaluation, and extra bus dispatch matrix.
  - `TrackBus`: Interactive Leaflet map displaying real-time bus positions and destination ETA.
  - `Tracking`: Lightweight, mobile-friendly GPS telemetry transmitter opened on the driver's smartphone.

### Backend (`backend/`)
- **Technology**: Node.js, Express, MongoDB (Mongoose), JWT, Bcrypt, Nodemailer.
- **Pattern**: Model-View-Controller (MVC) architecture.
- **Sub-components**:
  - `src/models`: Schemas for buses, drivers, trips, attendance, locations, and admin credentials.
  - `src/controllers`: Business logic enforcing atomic operations, state validation, and concurrency guards.
  - `src/routes`: HTTP endpoint declarations mapped to controllers.
  - `src/middleware`: JWT validation middleware (`authMiddleware.js`).
  - `src/utils`: Route geometry (`routeConfig.js`), dynamic LAN IP detection (`network.js`), and email delivery (`emailService.js`).
  - `ml/`: Python wrapper (`yolo_stub.py`) utilizing Ultralytics YOLOv8s (`yolov8s.pt`) to count passengers across multiple bus stand camera feeds.
  - `tests/`: Automated Node.js integration tests covering authentication, fleet lifecycle, depot bus management, and feature matrix.
  - `scripts/`: Operational tools for database reconciliation, admin reset, and validation.

### Documentation (`docs/`)
- `PROJECT_STRUCTURE.md`: Comprehensive repository tree and file inventory.
- `ARCHITECTURE.md`: Deep dive into data flow, YOLOv8 computer vision pipeline, decision matrix, and GPS tracking mechanics.
- `SETUP_GUIDE.md`: Step-by-step installation instructions for Node.js, Python, MongoDB, and local Wi-Fi testing.
