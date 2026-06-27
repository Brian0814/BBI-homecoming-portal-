import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDocFromServer, 
  collection, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query,
  onSnapshot
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Standardize configuration using environment variables if set (from the AI Studio settings),
// otherwise gracefully fall back to the pre-provisioned JSON file.
const env = (import.meta as any).env || {};
const resolvedConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey || "",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain || "",
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId || "",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket || "",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId || "",
  appId: env.VITE_FIREBASE_APP_ID || firebaseConfig.appId || "",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfig.measurementId || ""
};

const databaseId = env.VITE_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;

// Initialize Firebase
const app = initializeApp(resolvedConfig);
export const db = getFirestore(app, databaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth();

// Operation Types as defined in guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

/**
 * Standardized Firestore error handler to output diagnostic JSON strings.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email || null,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * CRITICAL CONSTRAINT: Test connection when the application initially boots.
 */
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

testConnection();
