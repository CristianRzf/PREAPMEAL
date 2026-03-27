// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import {initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
apiKey: "AIzaSyD3rJIyqIHKK3NZp_W-c_0tvW5MJnS-E5Y",
authDomain: "mealprep-cc565.firebaseapp.com",
projectId: "mealprep-cc565",
storageBucket: "mealprep-cc565.firebasestorage.app",
messagingSenderId: "399164119508",
appId: "1:399164119508:web:05f1b2d415017478a25e41",
measurementId: "G-QSWPC3C1SP"
};

// Initialize Firebase
//const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);
//auth
//export const auth = initializeAuth(app, {
    //persistence: getReactNativePersistence(AsyncStorage),
//});
//db
//export const firestore = getFirestore(app);
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);