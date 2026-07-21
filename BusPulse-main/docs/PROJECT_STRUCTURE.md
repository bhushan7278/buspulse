# BusPulse Project Structure

This document outlines the restructured, production-ready directory layout of the **BusPulse** project, showing the clean separation between the React frontend and the Express backend (refactored into a standard Model-View-Controller design pattern).

## Project Structure Tree

```
BusPulse/
├── README.md
├── TODO.md
├── docs/
│   └── PROJECT_STRUCTURE.md
├── frontend/                        <- React Frontend (Single Admin Panel)
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── api.js
│   │   └── routes.js
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── eslint.config.js
│   └── .gitignore
└── backend/                         <- Express Backend (REST API + YOLO ML)
    ├── .env                         <- Local environment variables (gitignored)
    ├── .env.example                 <- Template for environment variables
    ├── .gitignore
    ├── package.json
    ├── package-lock.json
    ├── src/
    │   ├── config/
    │   │   └── db.js                <- Mongoose database connection setup
    │   ├── models/                  <- Mongoose schemas (Model layer)
    │   │   ├── Attendance.js
    │   │   ├── Bus.js
    │   │   ├── Driver.js
    │   │   ├── Location.js
    │   │   └── Trip.js
    │   ├── controllers/             <- Route handlers & business operations (Controller layer)
    │   │   ├── busController.js
    │   │   ├── driverController.js
    │   │   ├── extraBusController.js
    │   │   ├── locationController.js
    │   │   ├── routeController.js
    │   │   └── tripController.js
    │   ├── routes/                  <- HTTP path to controller mappings (Routing layer)
    │   │   ├── busRoutes.js
    │   │   ├── driverRoutes.js
    │   │   ├── extraBusRoutes.js
    │   │   ├── locationRoutes.js
    │   │   ├── routeRoutes.js
    │   │   └── tripRoutes.js
    │   ├── utils/                   <- Seed data structures & utility functions
    │   │   ├── network.js
    │   │   └── seedData.js
    │   ├── index.js                 <- Application entrypoint
    │   └── update_db.js             <- Standalone script to update db
    └── ml/                          <- Computer Vision sub-component
        ├── yolo_stub.py             <- Python wrapper script
        ├── yolov8s.pt               <- Pre-trained YOLO model weights
        └── yolo_cache.pkl           <- YOLO compile cache file
```

---

## Folder & Component Descriptions

### `frontend/`
This folder contains the complete, one-and-only React-based frontend of BusPulse. It functions entirely as an **Admin and Operator Panel** used exclusively by depot staff, dispatchers, and administrators. It is crucial to note that **there is no passenger-facing application, customer portal, or public-facing user interface in this system**. Every view—including the live tracker opened via the WhatsApp utility link—is designed for operational/internal tracking rather than general public use.

### `backend/`
This folder contains the Node.js Express server that runs the system's REST API. The backend architecture follows the standard **Model-View-Controller (MVC)** design pattern:
- **Models (`src/models/`)**: Define the Mongoose database schemas (Attendance, Bus, Driver, Location, Trip).
- **Controllers (`src/controllers/`)**: Contain the core business logic, query execution, and response handling for incoming requests.
- **Routes (`src/routes/`)**: Map incoming HTTP requests (GET, POST, etc.) and URL paths to their respective controller functions, maintaining an organized API contract.
- **Config & Utils (`src/config/`, `src/utils/`)**: House initialization setups (database connection) and helper utilities (such as dynamic local network IP resolution).

### `backend/ml/`
Nested inside the backend sub-project, this directory contains the machine learning components. This includes the `yolo_stub.py` script, the pre-trained `yolov8s.pt` model weights, and the transient cache files used to automatically detect and count passengers from bus stop camera images.

### `docs/`
This folder contains documentation assets, structure logs, and operational guidelines for developers, evaluators, or interviewers seeking to understand or build the system.

---

## Environment Variable Configuration

Environment variables are managed dynamically using the `dotenv` library:
- **`backend/.env`**: Contains local, environment-specific configurations (such as port numbers, database URLs, and frontend addresses). This file is **gitignored** to protect local credentials and configuration drift.
- **`backend/.env.example`**: Committed to git as a boilerplate template showing the required environment keys (`PORT`, `MONGO_URI`, `FRONTEND_URL`, `NODE_ENV`) without exposing concrete values.

---

## How to Explain This Project in an Interview

> [!NOTE]
> When explaining BusPulse to an interviewer or technical evaluator, highlight the following:
>
> "BusPulse has a **single frontend**—an internal admin panel used by depot staff to manage driver attendance, dispatch trips, track live buses, and approve extra-bus allocation based on YOLOv8 passenger-count analysis. **There is no passenger-facing or customer app in this system**; the entire solution is positioned as a business-to-employee (B2E) transport optimization dashboard. Architecturally, the Express backend is structured using the **Model-View-Controller (MVC)** pattern to isolate data schemas, request routing, and business processing logic into maintainable, independent layers."
