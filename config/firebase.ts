// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { enableNetwork, getFirestore } from "firebase/firestore";
import { initializeAuth, getAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries


// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
//const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);
//auth
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();


export const auth = Platform.OS === "web"
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
export const db = getFirestore(app);

enableNetwork(db).catch((error) => {
  console.error("Error enabling Firestore network:", error);
});


//db
//export const firestore = getFirestore(app); 
//const app = initializeApp(firebaseConfig);
//export const auth = getAuth(app);