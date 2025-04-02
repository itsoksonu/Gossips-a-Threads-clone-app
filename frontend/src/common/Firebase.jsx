
import { initializeApp } from "firebase/app";
import {getAuth, GoogleAuthProvider, signInWithPopup} from "firebase/auth"

const firebaseConfig = {
    apiKey: "AIzaSyBJfiyrOfUYdd6yZA5TaXfp9YHcvXUHHaY",
    authDomain: "gossips-app.firebaseapp.com",
    projectId: "gossips-app",
    storageBucket: "gossips-app.firebasestorage.app",
    messagingSenderId: "124129405104",
    appId: "1:124129405104:web:82c439706ed19a6e493375"
  };

// eslint-disable-next-line no-unused-vars
const app = initializeApp(firebaseConfig);

// google auth

const provider = new GoogleAuthProvider();

const auth = getAuth();

export const authWithGoogle = async () => {
    
    let user = null;

    await signInWithPopup(auth, provider)
    .then((result) => {
       user = result.user
   
    } )
.catch((err) => {
    console.log(err)
})

    return user;
}