import { initializeApp } from "firebase/app";
import { initializeFirestore, setLogLevel } from "firebase/firestore";

const firebaseConfig = {
  projectId: "studio-6797084280-dc44e",
  appId: "1:589671797496:web:45c889da7ff3721871a10d",
  apiKey: "AIzaSyCv4KkEWJxju5RXUhgL1FVCxrxX9iBMBM4",
  authDomain: "studio-6797084280-dc44e.firebaseapp.com",
  storageBucket: "studio-6797084280-dc44e.firebasestorage.app",
  messagingSenderId: "589671797496",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Silence non-fatal transient network connection warnings in iframe/sandboxed environments
setLogLevel("error");

// Initialize Cloud Firestore
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  ignoreUndefinedProperties: true,
});


