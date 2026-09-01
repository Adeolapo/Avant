// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD41sy6xFE5ZxkStW3UlOx_la4bsIqxdwk",
  authDomain: "avant-49ab2.firebaseapp.com",
  projectId: "avant-49ab2",
  storageBucket: "avant-49ab2.firebasestorage.app",
  messagingSenderId: "415921031374",
  appId: "1:415921031374:web:91ef6eb66647fbe9f2689f",
  measurementId: "G-ZFYG7ZM7KY"
};

// Initialize Firebase

  const firebaseApp = initializeApp(firebaseConfig);
  //const analytics = getAnalytics(firebaseApp);
  export const db = getFirestore(firebaseApp);
  export const auth = getAuth(firebaseApp);
  export const provider = new GoogleAuthProvider();

  