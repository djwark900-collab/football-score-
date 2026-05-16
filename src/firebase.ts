import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  // Force long polling to avoid issues with blocked WebSockets/gRPC in some environments
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Connection test as per guidelines
export async function testConnection() {
  try {
    // We use getDocFromServer to verify real network connectivity
    // If this fails, Firestore SDK will automatically switch to offline mode
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection check: ONLINE");
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    const isOffline = errorMsg.includes('Could not reach Cloud Firestore backend') || 
                      errorMsg.includes('client is offline') || 
                      errorMsg.includes('unavailable') ||
                      errorMsg.includes('network');
    
    if (errorMsg.includes('Quota limit exceeded') || errorMsg.includes('Quota exceeded')) {
      console.warn("Firestore Limit Exceeded detected.");
    } else if (isOffline) {
      // Quietly log offline status
      console.log("Firestore connection check: OFFLINE (Operating in cache mode)");
    } else {
      console.warn("Firestore connectivity check status:", errorMsg);
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

let lastQuotaErrorTime = 0;
const QUOTA_ERROR_THROTTLE = 600000; // 10 minutes

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const isQuotaError = errorMsg.includes('Quota limit exceeded') || errorMsg.includes('Quota exceeded');
  const isNetworkError = errorMsg.includes('Could not reach Cloud Firestore backend') || 
                         errorMsg.includes('client is offline') || 
                         errorMsg.includes('unavailable');
  
  const errInfo: FirestoreErrorInfo = {
    error: errorMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };

  // Log everything to console as per guidelines for system diagnosis
  if (isQuotaError || isNetworkError) {
    const now = Date.now();
    if (now - lastQuotaErrorTime > QUOTA_ERROR_THROTTLE) {
      console.info(isQuotaError ? 'Firestore Limit reached. Using offline/stale data mode.' : 'Firestore connection issues. Operating in offline mode.', JSON.stringify(errInfo));
      lastQuotaErrorTime = now;
    }
    // Throw to let the UI catch it
    throw new Error(JSON.stringify(errInfo));
  } else {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }
}
