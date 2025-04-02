
import { initializeApp } from "firebase/app";
import {getAuth, GoogleAuthProvider, signInWithPopup} from "firebase/auth"

const firebaseConfig = {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
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
