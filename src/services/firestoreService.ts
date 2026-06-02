import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot,
  Timestamp,
  serverTimestamp,
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged,
  User,
  signInAnonymously
} from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { EvaluationScore, Evaluation } from '../types';

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

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const firestoreService = {
  async saveEvaluation(studentId: string, skillId: string, score: EvaluationScore, note: string = '', academicYear: string = '2024-2025', questionScores?: Record<number, number>) {
    const userId = auth.currentUser?.uid || 'anonymous';
    
    const evaluationId = `${studentId}_${skillId}_${academicYear}`;
    const path = `evaluations/${evaluationId}`;
    
    try {
      await setDoc(doc(db, 'evaluations', evaluationId), {
        id: evaluationId,
        studentId,
        skillId,
        score,
        note,
        academicYear,
        ...(questionScores && { questionScores }),
        updatedAt: serverTimestamp(),
        evaluatorId: userId
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  subscribeToEvaluations(callback: (evals: Record<string, Evaluation>) => void) {
    const path = 'evaluations';
    const q = query(collection(db, path));
    
    return onSnapshot(q, (snapshot) => {
      const evals: Record<string, Evaluation> = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        const year = data.academicYear || '2024-2025';
        evals[`${data.studentId}-${data.skillId}-${year}`] = {
          score: data.score,
          note: data.note,
          academicYear: year,
          updatedAt: data.updatedAt,
          questionScores: data.questionScores
        };
      });
      callback(evals);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  async login() {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  },

  async loginAnonymously() {
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
    } catch (error) {
      console.warn('Anonymous login error, proceeding in offline mode (requires no authentication in rules):', error);
    }
  },

  async logout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  async saveItem(collectionName: string, id: string, data: any) {
    const userId = auth.currentUser?.uid || 'anonymous_user';
    const path = `${collectionName}/${id}`;
    try {
      await setDoc(doc(db, collectionName, id), {
        ...data,
        id,
        updatedAt: serverTimestamp(),
        createdBy: userId
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async deleteItem(collectionName: string, id: string) {
    const path = `${collectionName}/${id}`;
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async deleteEvaluation(studentId: string, skillId: string, academicYear: string = '2024-2025') {
    const evaluationId = `${studentId}_${skillId}_${academicYear}`;
    const path = `evaluations/${evaluationId}`;
    
    try {
      await deleteDoc(doc(db, 'evaluations', evaluationId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async resetAllEvaluations(studentIds: string[], skillIds: string[], academicYear: string) {
    for (const studentId of studentIds) {
      for (const skillId of skillIds) {
        const evalId = `${studentId}_${skillId}_${academicYear}`;
        try {
          await deleteDoc(doc(db, 'evaluations', evalId));
        } catch (e) {
          console.error('Error deleting evaluation:', e);
        }
      }
    }
  },

  subscribeToCollection(collectionName: string, callback: (items: any[]) => void) {
    const q = query(collection(db, collectionName));
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, collectionName);
    });
  },

  async getCollection(collectionName: string) {
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, collectionName);
      return [];
    }
  },

  async getExternalProfile(profileId: string) {
    const path = `externalProfiles/${profileId}`;
    try {
      const docRef = doc(db, 'externalProfiles', profileId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() };
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async saveQuizResult(result: any) {
    const id = `${result.studentId}_${result.quizId}`;
    try {
      await setDoc(doc(db, 'quizResults', id), {
        ...result,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `quizResults/${id}`);
    }
  },

  onAuth(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }
};
