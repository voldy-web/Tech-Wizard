# Tech Wizard

Create, calculate and export construction **Certificates of Claim** (money in GH₵).

```
Tech-Wizard/
├── backend/   Java 17 · Spring Boot 3 · Maven · H2 (dev) / PostgreSQL (prod)
├── mobile/    React Native · Expo (runs in Expo Go) · expo-router · JavaScript
└── Tech-Wizard.code-workspace   ← open this in VS Code
```

## Open in VS Code

`File → Open Workspace from File… → Tech-Wizard.code-workspace` (shows root, backend and mobile side by side),
or simply `code Tech-Wizard`.

## 1. Run the backend

Requires **JDK 17+**.

```bash
cd backend
./mvnw spring-boot:run                       # http://localhost:8080  (Windows: mvnw.cmd spring-boot:run)
./mvnw spring-boot:run -Dspring-boot.run.arguments=--techwizard.seed-demo=true   # optional sample data
./mvnw test                                  # JUnit 5 tests
```

* Local dev uses an **H2 file database** (`backend/data/`). H2 console: http://localhost:8080/h2-console
  (JDBC URL `jdbc:h2:file:./data/techwizard`, user `sa`, empty password).
* **PostgreSQL (production):** `SPRING_PROFILES_ACTIVE=postgres DB_URL=jdbc:postgresql://host:5432/techwizard DB_USER=… DB_PASSWORD=… CORS_ORIGINS=https://your.app ./mvnw spring-boot:run`
* CORS is open (`*`) for development; restrict with `techwizard.cors.allowed-origins`.
* **All money is `BigDecimal`, scale 2, `RoundingMode.HALF_UP`.** `ClaimCalculator` is the source of truth; the server recalculates on every save.

## Deploy the backend on Render

`render.yaml` + `backend/Dockerfile` deploy the API with a managed PostgreSQL database and a generated `API_KEY`.
See **[docs/DEPLOY-RENDER.md](docs/DEPLOY-RENDER.md)** for the step-by-step guide.

## 2. Run the mobile app

Requires Node 18+ and the **Expo Go** app on your phone.

```bash
cd mobile
npm install
cp .env.example .env      # then edit EXPO_PUBLIC_API_URL (see below)
npx expo start
```

Scan the QR code with **Expo Go** (Android) or the Camera app (iOS). Phone and computer must be on the **same Wi-Fi**.

### ⚠️ API URL: use your computer's LAN IP, not `localhost`

The API base URL lives in **one place**: `mobile/src/config.js`, driven by the `EXPO_PUBLIC_API_URL` env variable.

On a real phone running Expo Go, `localhost` means *the phone itself*, so the app cannot find the backend. Set it to your
computer's LAN IP, e.g.

```
EXPO_PUBLIC_API_URL=http://192.168.1.50:8080
```

Find your IP: Windows `ipconfig` · macOS `ipconfig getifaddr en0` · Linux `hostname -I`.
(`localhost` is fine only for a simulator/emulator-on-the-same-machine or the web build; Android emulator uses `http://10.0.2.2:8080`.)
If it isn't set, the app tries the IP Expo is already serving from. If the app shows
*"Can't reach the Tech Wizard server"*, check: backend running · same Wi-Fi · firewall allows port 8080 · correct IP.
Restart `npx expo start` (add `-c` to clear cache) after changing `.env`.

### Frontend-only mode (no Java needed)

```bash
cd mobile
npm run mock        # Expo with built-in sample data  (also: npm run web:mock for the browser)
```
The app shows a "Demo mode" banner and keeps everything in memory (resets on reload). Great for testing the UI.

### Tests

```bash
npm test            # Jest (jest-expo): calculations, mock API, claim model, certificate HTML, components, errors
npm run test:e2e    # optional browser smoke test of the whole UI (see the header of mobile/e2e/smoke.web.js)
```

## The shared test case

`backend/.../ClaimCalculatorTest` (JUnit) and `mobile/__tests__/calc.test.js` (Jest) assert the same numbers:
subTotal **111,150.00** · levy **7,780.50** · total **118,930.50** · grandTotal **126,664.50**.

## API summary

| Method | Path | |
|---|---|---|
| GET/POST | `/api/projects` | list / create |
| GET/PUT/DELETE | `/api/projects/{id}` | |
| GET/POST | `/api/projects/{id}/claims` | POST auto-increments week, pre-fills Balance B/F |
| GET/PUT/DELETE | `/api/claims/{id}` | PUT = header (week, period, levy %, B/F, notes) |
| PUT | `/api/claims/{id}/items` | replace all line items (order = array order) |
| POST | `/api/claims/{id}/duplicate` | next week, items copied, B/F recomputed |
| PATCH | `/api/claims/{id}/status` | DRAFT → SUBMITTED → APPROVED → PAID (+ approver / payment) |
| POST/DELETE | `/api/claims/{id}/payments[/{pid}]` | payment audit log |
| GET | `/api/dashboard` | claimed / approved / paid / outstanding |
| GET/PUT | `/api/settings` | company, logo, signature, levy, units, common items |

## Screens (mobile)

Bottom tabs: **Dashboard · Projects · Claims · Approvals · Settings**, plus stack screens:
project detail / edit, **claim editor** (drag to reorder, quick-add chips, mismatch warnings, sticky Grand Total, autosave),
**certificate preview** (A4 HTML → Print / Export PDF / Share via `expo-print` + `expo-sharing`) and **approval & payment**.
