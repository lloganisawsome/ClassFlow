// js/firebase-init.js
// ClassFlow — Firebase SDK initialization

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase }    from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey:            "AIzaSyBSrXzowRwLUf1qjvLVXLm4C7Oiop1Xee0",
  authDomain:        "classflow-llogan.firebaseapp.com",
  databaseURL:       "https://classflow-llogan-default-rtdb.firebaseio.com",
  projectId:         "classflow-llogan",
  storageBucket:     "classflow-llogan.firebasestorage.app",
  messagingSenderId: "345726576509",
  appId:             "1:345726576509:web:be8bfeb836406c4ca24e14",
  measurementId:     "G-QE9BJDY2V4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getDatabase(app);
