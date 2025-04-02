const storeInSession = (key, data) => {
    return sessionStorage.setItem(key, JSON.stringify(data));
 }
 
 const lookInSession = (key) => {
     return sessionStorage.getItem(key);
 }
 
 const removeFromSession = (key) => {
     return sessionStorage.removeItem(key);
 }
 
 export {storeInSession, lookInSession, removeFromSession}