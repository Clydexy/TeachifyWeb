import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyCfHzES-r4MRhGtPapvtmkGPdZJWkgCdpw",
  authDomain: "kgv-teachify.firebaseapp.com",
  projectId: "kgv-teachify",
  storageBucket: "kgv-teachify.firebasestorage.app",
  messagingSenderId: "203294046256",
  appId: "1:203294046256:web:df62b358a16eef5d10d5f5",
  measurementId: "G-YE6EYSSFJG"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);