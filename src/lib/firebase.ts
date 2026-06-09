import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer, enableIndexedDbPersistence } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase with the config from ai studio
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use initializeFirestore with settings optimized for potentially restricted network environments
// Long polling is often more reliable in containerized/iFrame environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, (firebaseConfig as any).firestoreDatabaseId);

// Enable offline persistence
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a a time.
      console.warn('Firestore Persistence failed-precondition: Multiple tabs open.');
    } else if (err.code === 'unimplemented') {
      // The current browser does not support all of the features required to enable persistence
      console.warn('Firestore Persistence unimplemented: Browser not supported.');
    }
  });
} catch (err) {
  console.debug('Firestore persistence error:', err);
}

// Production diagnostic: verifying bridge to the backend services
async function verifyFirebaseConnectivity() {
  try {
    // Graceful delay for auth initialization state to settle
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Attempt a direct read from the server to bypass cache
    await getDocFromServer(doc(db, '_internal_', 'health_check'));
    console.info("Firebase: Connection to Firestore established successfully.");
  } catch (error: any) {
    // Specific handling for common network/initialization issues
    const isNetworkError = error?.code === 'unavailable' || 
                          error?.message?.includes('offline') || 
                          error?.message?.includes('network-request-failed');
    
    if (isNetworkError) {
      console.warn(
        "Firebase Connectivity Warning:\n" +
        "1. Ensure Firestore is enabled (Spark/Enterprise) at: https://console.firebase.google.com/project/" + firebaseConfig.projectId + "/firestore\n" +
        "2. Ensure Google Auth is enabled at: https://console.firebase.google.com/project/" + firebaseConfig.projectId + "/authentication/providers\n" +
        "3. Check your internet connection or if a firewall is blocking *.firebaseio.com / *.googleapis.com"
      );
    } else if (error?.code === 'permission-denied') {
      // Permission denied is actually a good sign of connectivity (the server responded)
      console.info("Firebase: Connection verified (received permission rejection as expected).");
    } else {
      console.debug("Firebase Diagnostic Detail:", error);
    }
  }
}

// Fire and forget connectivity check
verifyFirebaseConnectivity();
