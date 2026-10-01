# Campusly Frontend (Mobile & Web) 📱💻

This is the cross-platform frontend for **Campusly**, built with [React Native](https://reactnative.dev) and [Expo SDK 57](https://expo.dev), utilizing [Expo Router](https://docs.expo.dev/router/introduction) for file-based routing.

## 🚀 Supported Platforms
- **Android** (APK, AAB via EAS Build, or Expo Go)
- **iOS** (TestFlight / IPA via EAS Build, or Expo Go)
- **Web** (Vercel static web deployment ready via `dist`)

## 🛠️ Project Structure
```
studyapp/
├── app/                  # Route root and global screens
├── src/
│   ├── app/              # File-based routes (tabs, auth, admin, modals)
│   │   ├── (tab)/        # Bottom tabs: Home, Schedule, Tasks, Progress, Profile, AI
│   │   └── admin/        # Admin dashboard & management screens
│   ├── components/       # Custom components, pickers, markdown & banners
│   ├── constants/        # Theme & styling constants
│   ├── context/          # State providers
│   ├── firebase/         # Firebase Client SDK authentication & Firestore
│   ├── hooks/            # Custom hooks (theme, subjects, admin)
│   └── services/         # API integration services
├── assets/               # Splash screens, app icons, images
├── eas.json              # EAS Build configuration
└── vercel.json           # Vercel deployment configuration
```

## ⚙️ Setup & Configuration

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Set `EXPO_PUBLIC_API_URL` to your backend URL (e.g., `http://localhost:5000` or production Vercel backend).

3. Start the development server:
   ```bash
   npm start
   ```

4. Run on specific targets:
   ```bash
   npm run web       # Run in web browser
   npm run android   # Run on Android emulator / connected device
   npm run ios       # Run on iOS simulator
   ```

## 🌐 Deploy to Vercel
This directory includes a [vercel.json](file:///C:/Users/nnira/Desktop/Campusly/studyapp/vercel.json) configured for static export:
- Build command: `npx expo export -p web` (or `npm run build`)
- Output directory: `dist`
- SPA fallback routing: enabled

## 📱 Mobile Production Builds (EAS)
```bash
# Build Android APK preview
npx eas-cli build -p android --profile preview

# Build production Android App Bundle (AAB)
npx eas-cli build -p android --profile production
```
