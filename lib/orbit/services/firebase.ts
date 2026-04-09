import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCZvhDqxmU74KHZxy-_cHCmTuf0PSYL85o",
  authDomain: "apartment-rental-free-p-lh81y5.firebaseapp.com",
  databaseURL: "https://apartment-rental-free-p-lh81y5-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "apartment-rental-free-p-lh81y5",
  storageBucket: "apartment-rental-free-p-lh81y5.firebasestorage.app",
  messagingSenderId: "994188454347",
  appId: "1:994188454347:web:3f9706fb5c787e66d86e4e"
};

// Singleton pattern to prevent multiple initializations
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const rtdb = getDatabase(app);

export { app, rtdb };
