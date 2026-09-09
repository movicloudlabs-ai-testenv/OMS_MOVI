# 📱 Movi OWMS Mobile (React Native + Expo)

Enterprise mobile application for **Office Workspace Management System (OWMS / OMS)**, built using **React Native**, **Expo SDK**, **TypeScript**, and **Hardware-Backed Cryptographic Security**.

---

## 🚀 Key Features

* **Role-Based Dynamic Shell**: Dynamically transitions UI and tabs across all 5 roles:
  * 👑 **Super Admin**: System overview metrics, user list, live audit logs.
  * 👥 **HR Manager**: Employee directory, leave approval queue, staff status.
  * 📊 **PMO Lead**: Projects overview, health indicators, task reviews.
  * 💼 **Employee**: Geofenced GPS attendance, touch Kanban tasks, leave portal, daily EOD reports.
  * 🎓 **Intern**: Learning milestones, deliverables, daily tracking.
* **Geofenced GPS Attendance**:
  * Real-time GPS distance calculation against office coordinates with radius threshold.
  * **Anti-Spoofing & Mock Location Detection** on Android & iOS.
* **Hardware-Backed Secure Storage**:
  * Tokens stored in **iOS Keychain** / **Android Keystore** via AES-256 encrypted storage (`expo-secure-store`).
* **Biometric Authentication**:
  * Instant unlock using **FaceID**, **TouchID**, or **Fingerprint** (`expo-local-authentication`).
* **Real-time Notifications**:
  * In-app notification bell with unread badge counter and polling/push integration.

---

## 🛠️ Getting Started

### 1. Prerequisites
* Node.js v18+
* Expo Go app installed on your physical device (iOS / Android), or Android Studio / Xcode simulator.

### 2. Install Dependencies
```bash
cd mobile
npm install
```

### 3. Configure API Base URL
Edit `src/config/env.ts` or create `.env`:
* **Android Emulator**: Uses `http://10.0.2.2:5000`
* **iOS Simulator**: Uses `http://localhost:5000`
* **Physical Device (Expo Go)**: Set `EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:5000`

### 4. Run the App
```bash
# Start Metro Bundler
npx expo start

# Run directly on Android Emulator
npx expo start --android

# Run directly on iOS Simulator (macOS only)
npx expo start --ios

# Run in Web Browser
npx expo start --web
```

---

## 📂 Project Architecture

```text
mobile/
├── src/
│   ├── api/             # Axios instance + Auth, Employee, PMO, HR, Admin APIs
│   ├── config/          # Environment variables & Office Geofence coords
│   ├── context/         # AuthContext (Biometrics, Role RBAC) & NotificationContext
│   ├── components/      # Design System (Button, Card, Badge, Input, StatCard, Header)
│   ├── navigation/      # RootNavigator & Role Tab Navigators (Employee, HR, PMO, Admin, Intern)
│   ├── screens/         # Feature screens by role
│   ├── services/        # Hardware storage (SecureStore), Biometrics, GPS Location
│   └── styles/          # Dark Enterprise Theme & design tokens
```
