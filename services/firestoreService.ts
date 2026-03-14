import { db, serverTimestamp, increment } from '../lib/firebase';
import { Activity, PageMetadata, ClassTag, Material, TeacherLabel } from '../types';
import { logActivityCreated, logPageUpload } from './analyticsService';

// Helper: Calculate text delta (Remix Score component)
const calculateDelta = (originalLength: number, finalLength: number): number => {
  if (!originalLength) return 0;
  return Math.abs(finalLength - originalLength);
};

// The Sensor: Updates the 'Digital Twin' of the book
const updateContentAsset = async (
  bookTitle: string, 
  publisher: string, 
  metrics: { 
    remix: boolean; 
    delta?: number; 
    difficultyChange?: number;
    generationType?: string; 
  }
) => {
  if (!bookTitle || bookTitle === 'Unknown Book') return;

  const assetId = bookTitle.trim().replace(/[^a-zA-Z0-9\-_ ]/g, '_'); 
  const assetRef = db.collection('contentAssets').doc(assetId);

  try {
    const updatePayload: any = {
      bookTitle,
      publisher,
      lastInteractionTimestamp: serverTimestamp(),
      totalInteractions: increment(1)
    };

    if (metrics.remix) {
      updatePayload.totalRemixes = increment(1);
      
      if (metrics.delta !== undefined) {
        updatePayload.cumulativeDelta = increment(metrics.delta);
      }
      if (metrics.difficultyChange !== undefined) {
        updatePayload.cumulativeDifficultyChange = increment(metrics.difficultyChange);
      }
      
      if (metrics.generationType) {
        const typeKey = metrics.generationType.toLowerCase().replace(/\s+/g, '_');
        updatePayload[`generatedTypes.${typeKey}`] = increment(1);
      }
    }

    await assetRef.set(updatePayload, { merge: true });
    console.log(`📡 Digital Twin Updated: "${bookTitle}"`, metrics);
  } catch (error) {
    console.error("Asset tracking sensor failed:", error);
  }
};

// ACTIVITY MANAGEMENT
export const saveActivity = async (userId: string, activity: Partial<Activity>): Promise<string> => {
  try {
    const finalLength = (activity.studentContent || '').length;
    const originalLength = activity.source?.originalLength || 0;
    const delta = calculateDelta(originalLength, finalLength);
    const difficultyDelta = activity.source?.difficultyDelta || 0;

    const activityData = {
      userId,
      title: activity.title || 'Untitled Activity',
      type: activity.type || 'quiz',
      activityType: activity.activityType || activity.category || activity.interactiveData?.category || activity.type || 'mixed',
      level: activity.level || 'B1',
      status: activity.status || 'draft',
      teacherNotes: activity.teacherNotes || '',
      studentContent: activity.studentContent || '',
      answerKey: activity.answerKey || null,
      topic: activity.topic || '',
      source: {
        ...activity.source,
        originalLength, 
        difficultyDelta,
        remixScore: delta 
      } || null,
      contentPool: activity.contentPool || null,
      interactiveData: activity.interactiveData ? JSON.parse(JSON.stringify(activity.interactiveData)) : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isFavorite: activity.isFavorite || false,
      timesUsed: 0,
    };

    const docRef = await db.collection('activities').add(activityData);
    logActivityCreated(userId, { ...activityData, id: docRef.id } as any, null);
    
    if (activity.source?.bookTitle && activity.source?.publisher) {
      const genType = activityData.activityType;
      await updateContentAsset(
        activity.source.bookTitle, 
        activity.source.publisher, 
        { 
          remix: true, 
          delta: delta, 
          difficultyChange: difficultyDelta,
          generationType: genType 
        }
      );
    }
    
    return docRef.id;
  } catch (error: any) {
    console.error("Error saving activity:", error);
    throw error;
  }
};

export const getActivity = async (activityId: string): Promise<Activity | null> => {
  try {
    const docSnap = await db.collection('activities').doc(activityId).get();
    if (!docSnap.exists) return null;
    const data = docSnap.data();
    return { id: docSnap.id, ...data } as Activity;
  } catch (error: any) {
    console.error("Error fetching activity:", error);
    return null;
  }
};

export const getActivities = async (userId: string): Promise<Activity[]> => {
  try {
    const snapshot = await db.collection('activities')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Activity[];
  } catch (error: any) {
    return [];
  }
};

export const getPaginatedActivities = async (userId: string, lastDocRef: any = null, limitVal: number = 12): Promise<{ data: Activity[], lastVisible: any }> => {
  try {
    let q = db.collection('activities')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc');

    if (lastDocRef) {
      q = q.startAfter(lastDocRef);
    }

    q = q.limit(limitVal);

    const snapshot = await q.get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Activity[];
    const lastVisible = snapshot.docs[snapshot.docs.length - 1];

    return { data, lastVisible };
  } catch (error: any) {
    console.error("Error fetching paginated activities:", error);
    return { data: [], lastVisible: null };
  }
};

export const deleteActivity = async (activityId: string): Promise<void> => {
  try {
    await db.collection('activities').doc(activityId).delete();
  } catch (error) {
    throw error;
  }
};

export const updateActivity = async (activityId: string, updates: Partial<Activity>): Promise<void> => {
  try {
    await db.collection('activities').doc(activityId).update({
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    throw error;
  }
};

export const updateActivityField = async (activityId: string, fields: Partial<Activity>) => {
  await db.collection('activities').doc(activityId).update(fields);
};

// PAGE SOURCE MANAGEMENT
export const uploadPage = async (userId: string, pageData: Partial<PageMetadata>): Promise<PageMetadata> => {
  try {
    const pagePayload = {
      userId,
      uploadedAt: serverTimestamp(),
      publisher: pageData.publisher || 'Other',
      publisherOther: pageData.publisherOther || null,
      bookTitle: pageData.bookTitle || 'Unknown Book',
      unitPage: pageData.unitPage || null,
      isTagged: pageData.isTagged || false,
      extractedMetadata: pageData.extractedMetadata || {
        vocabularyCount: 0,
        grammarPointsCount: 0,
        topic: 'Unknown',
        estimatedLevel: 'B1',
        textType: 'mixed'
      }
    };
    const docRef = await db.collection('pages').add(pagePayload);
    const newPage = { id: docRef.id, ...pagePayload } as any;
    logPageUpload(userId, newPage, null);
    
    if (pageData.bookTitle && pageData.publisher) {
      await updateContentAsset(pageData.bookTitle, pageData.publisher, { remix: false });
    }

    return newPage;
  } catch (error: any) {
    throw error;
  }
};

// CLASS TAGS MANAGEMENT
export const createClassTag = async (teacherId: string, name: string, schoolYear: string, color: string) => {
  try {
    const tagPayload = {
      teacherId,
      name,
      schoolYear,
      color,
      studentCount: 0,
      createdAt: serverTimestamp(),
      isArchived: false,
    };
    const docRef = await db.collection('classTags').add(tagPayload);
    return { id: docRef.id, ...tagPayload };
  } catch (error) {
    console.error("Error creating class tag:", error);
    throw error;
  }
};

export const getClassTags = async (teacherId: string, includeArchived: boolean = false): Promise<ClassTag[]> => {
  try {
    let q = db.collection('classTags').where('teacherId', '==', teacherId);
    if (!includeArchived) {
      q = q.where('isArchived', '==', false);
    }
    const snapshot = await q.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ClassTag[];
  } catch (error: any) {
    // Fallback if index missing
    const qFallback = db.collection('classTags').where('teacherId', '==', teacherId);
    const snapshotFallback = await qFallback.get();
    let docs = snapshotFallback.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassTag));
    if (!includeArchived) docs = docs.filter(tag => tag.isArchived !== true);
    return docs.sort((a, b) => {
      const dateA = (a.createdAt as any)?.toDate ? (a.createdAt as any).toDate().getTime() : new Date(a.createdAt || 0).getTime();
      const dateB = (b.createdAt as any)?.toDate ? (b.createdAt as any).toDate().getTime() : new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }
};

export const updateClassTag = async (tagId: string, updates: Partial<ClassTag>) => {
  try {
    await db.collection('classTags').doc(tagId).update(updates);
  } catch (error) {
    console.error("Error updating class tag:", error);
    throw error;
  }
};

export const archiveClassTag = async (tagId: string, isArchived: boolean = true) => {
  try {
    await db.collection('classTags').doc(tagId).update({ isArchived });
  } catch (error) {
    console.error("Error archiving class tag:", error);
    throw error;
  }
};

export const deleteClassTag = async (tagId: string) => {
  try {
    await db.collection('classTags').doc(tagId).delete();
  } catch (error) {
    console.error("Error deleting class tag:", error);
    throw error;
  }
};

// MAGIC LINKS & RESPONSES
export const createMagicLink = async (
  userId: string, 
  activityId: string, 
  config: { 
    mode: string, 
    collectName: boolean, 
    showAnswers: boolean, 
    classTagId?: string | null, 
    classTagName?: string | null,
    includeNotes?: boolean,
    includeKey?: boolean
  }
) => {
  try {
    const activity = await getActivity(activityId);
    if (!activity) throw new Error('Activity not found');

    // Always snapshot the activity content into the magic link document.
    // This means the TestPage never needs to read from /activities directly,
    // allowing us to restrict that collection to signed-in users only.
    const contentSnapshot = {
      title: activity.title,
      activityType: activity.activityType || activity.category || 'mixed',
      level: activity.level || 'B1',
      studentContent: activity.studentContent || '',
      teacherNotes: config.includeNotes ? (activity.teacherNotes || '') : null,
      answerKey: config.includeKey ? (activity.answerKey || '') : null,
      // Interactive fields (null for print-only activities)
      instructions: activity.interactiveData?.instructions || '',
      questions: activity.interactiveData?.questions || [],
      wordBank: activity.interactiveData?.wordBank || [],
      totalQuestions: activity.interactiveData?.questions?.length || 0,
    };

    const linkPayload = {
      activityId,
      userId,
      mode: config.mode,
      collectName: config.collectName,
      showAnswers: config.showAnswers,
      classTagId: config.classTagId || null,
      classTagName: config.classTagName || null,
      content: contentSnapshot,
      includeNotes: config.includeNotes || false,
      includeKey: config.includeKey || false,
      createdAt: serverTimestamp(),
      isActive: true,
      responsesCount: 0
    };
    
    const docRef = await db.collection('magicLinks').add(linkPayload);
    return { id: docRef.id, ...linkPayload };
  } catch (error: any) {
    throw error;
  }
};

export const getMagicLink = async (linkId: string) => {
  try {
    const docSnap = await db.collection('magicLinks').doc(linkId).get();
    if (!docSnap.exists) return null;
    return { id: docSnap.id, ...docSnap.data() } as any;
  } catch (error: any) {
    return null;
  }
};

export const getMagicLinksForActivity = async (activityId: string) => {
  try {
    const q = db.collection('magicLinks')
      .where('activityId', '==', activityId)
      .orderBy('createdAt', 'desc');
    const snapshot = await q.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error: any) {
    // Fallback if index missing
    const qFallback = db.collection('magicLinks').where('activityId', '==', activityId);
    const snapshotFallback = await qFallback.get();
    const docs = snapshotFallback.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    return docs.sort((a, b) => {
      const dateA = (a.createdAt as any)?.toDate ? (a.createdAt as any).toDate().getTime() : new Date(a.createdAt || 0).getTime();
      const dateB = (b.createdAt as any)?.toDate ? (b.createdAt as any).toDate().getTime() : new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }
};

export const saveStudentResponse = async (response: { magicLinkId: string, studentName: string, answers: any[], score: number, totalQuestions: number, submittedAt: number }) => {
  try {
    const linkRef = db.collection('magicLinks').doc(response.magicLinkId);
    
    // 1. Get Context (Best Effort)
    let classTagId = null;
    try {
        const linkSnap = await linkRef.get();
        const linkData = linkSnap.data();
        classTagId = linkData?.classTagId || null;
    } catch (e) {
        console.warn("Error fetching context for response:", e);
    }

    // 2. Critical Write
    const docRef = await linkRef.collection('responses').add({
      ...response,
      classTagId, 
      submittedAt: serverTimestamp()
    });
    
    // 3. Non-Critical Updates (Fire-and-forget)
    // We intentionally do not await these to prevent blocking and to ignore errors
    linkRef.update({
      responsesCount: increment(1)
    }).catch(e => console.warn("Non-critical update failed (responsesCount):", e));

    if (classTagId) {
      db.collection('classTags').doc(classTagId).update({
        studentCount: increment(1)
      }).catch(e => console.warn("Non-critical update failed (studentCount):", e));
    }

    return docRef.id;
  } catch (error: any) {
    console.error("Critical error saving response:", error);
    throw error;
  }
};

export const getResponsesForMagicLink = async (magicLinkId: string) => {
  try {
    const q = db.collection('magicLinks').doc(magicLinkId).collection('responses').orderBy('submittedAt', 'desc');
    const snapshot = await q.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error: any) {
    // Fallback
    const snapshotFallback = await db.collection('magicLinks').doc(magicLinkId).collection('responses').get();
    const docs = snapshotFallback.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    return docs.sort((a, b) => {
      const dateA = (a.submittedAt as any)?.toDate ? (a.submittedAt as any).toDate().getTime() : new Date(a.submittedAt || 0).getTime();
      const dateB = (b.submittedAt as any)?.toDate ? (b.submittedAt as any).toDate().getTime() : new Date(b.submittedAt || 0).getTime();
      return dateB - dateA;
    });
  }
};

// === MATERIALS MANAGEMENT ===

export const saveMaterial = async (teacherId: string, materialData: { title: string; publisher: string; bookTitle: string; unitTags: string[]; labelTags: string[]; vocabulary: string[]; grammar: string[]; topic: string; level: string; pageCount: number; ocrTexts?: string[]; }): Promise<string> => {
  try {
    const payload = {
      teacherId,
      title: materialData.title,
      publisher: materialData.publisher,
      bookTitle: materialData.bookTitle,
      unitTags: materialData.unitTags || [],
      labelTags: materialData.labelTags || [],
      vocabulary: materialData.vocabulary || [],
      grammar: materialData.grammar || [],
      topic: materialData.topic || '',
      level: materialData.level || 'B1',
      pageCount: materialData.pageCount || 1,
      ocrTexts: materialData.ocrTexts || [],
      isFavorite: false,
      createdAt: serverTimestamp(),
      lastUsedAt: null,
      timesUsed: 0
    };
    
    const docRef = await db.collection('materials').add(payload);
    
    for (const label of materialData.labelTags) {
      await ensureTeacherLabel(teacherId, label);
    }
    
    if (materialData.bookTitle && materialData.publisher) {
        await updateContentAsset(materialData.bookTitle, materialData.publisher, { remix: false });
    }

    return docRef.id;
  } catch (error) {
    console.error('Error saving material:', error);
    throw error;
  }
};

export const getMaterials = async (teacherId: string): Promise<Material[]> => {
  try {
    const q = db.collection('materials')
      .where('teacherId', '==', teacherId)
      .orderBy('isFavorite', 'desc')
      .orderBy('createdAt', 'desc');
    const snapshot = await q.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Material[];
  } catch (error: any) {
    // Fallback
    const qFallback = db.collection('materials').where('teacherId', '==', teacherId);
    const snapshot = await qFallback.get();
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Material[];
    return docs.sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      const dateA = a.createdAt?.toDate?.()?.getTime() || 0;
      const dateB = b.createdAt?.toDate?.()?.getTime() || 0;
      return dateB - dateA;
    });
  }
};

export const getPaginatedMaterials = async (teacherId: string, lastDocRef: any = null, limitVal: number = 12): Promise<{ data: Material[], lastVisible: any }> => {
  try {
    let q = db.collection('materials')
      .where('teacherId', '==', teacherId)
      .orderBy('isFavorite', 'desc')
      .orderBy('createdAt', 'desc');

    if (lastDocRef) {
      q = q.startAfter(lastDocRef);
    }

    q = q.limit(limitVal);

    const snapshot = await q.get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Material[];
    const lastVisible = snapshot.docs[snapshot.docs.length - 1];

    return { data, lastVisible };
  } catch (error: any) {
    // Fallback
    if (error.message && error.message.includes('requires an index')) {
       console.warn("Index missing for sort. Falling back to simple query.");
       let q = db.collection('materials').where('teacherId', '==', teacherId);
       q = q.limit(limitVal);
       const snap = await q.get();
       const d = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Material[];
       return { data: d, lastVisible: snap.docs[snap.docs.length - 1] };
    }
    return { data: [], lastVisible: null };
  }
};

export const getMaterial = async (materialId: string): Promise<Material | null> => {
  try {
    const docSnap = await db.collection('materials').doc(materialId).get();
    if (!docSnap.exists) return null;
    return { id: docSnap.id, ...docSnap.data() } as Material;
  } catch (error) {
    return null;
  }
};

export const updateMaterial = async (materialId: string, updates: Partial<Material>): Promise<void> => {
  try {
    await db.collection('materials').doc(materialId).update(updates);
  } catch (error) {
    throw error;
  }
};

export const deleteMaterial = async (materialId: string): Promise<void> => {
  try {
    await db.collection('materials').doc(materialId).delete();
  } catch (error) {
    throw error;
  }
};

export const toggleMaterialFavorite = async (materialId: string, isFavorite: boolean): Promise<void> => {
  try {
    await db.collection('materials').doc(materialId).update({ isFavorite });
  } catch (error) {
    throw error;
  }
};

export const recordMaterialUsage = async (materialId: string): Promise<void> => {
  try {
    await db.collection('materials').doc(materialId).update({
      lastUsedAt: serverTimestamp(),
      timesUsed: increment(1)
    });

    const material = await getMaterial(materialId);
    if (material && material.bookTitle && material.publisher) {
        await updateContentAsset(material.bookTitle, material.publisher, { remix: false });
    }

  } catch (error) {
    console.error('Error recording usage:', error);
  }
};

// === TEACHER LABELS ===

export const ensureTeacherLabel = async (teacherId: string, labelName: string): Promise<void> => {
  try {
    const q = db.collection('teacherLabels')
      .where('teacherId', '==', teacherId)
      .where('name', '==', labelName)
      .limit(1);
    const snapshot = await q.get();
    
    if (snapshot.empty) {
      await db.collection('teacherLabels').add({
        teacherId,
        name: labelName,
        color: '#6B7280',
        usageCount: 1,
        createdAt: serverTimestamp()
      });
    } else {
      await snapshot.docs[0].ref.update({
        usageCount: increment(1)
      });
    }
  } catch (error) {
    console.error('Error ensuring label:', error);
  }
};

export const getTeacherLabels = async (teacherId: string): Promise<TeacherLabel[]> => {
  try {
    const q = db.collection('teacherLabels')
      .where('teacherId', '==', teacherId)
      .orderBy('name', 'asc');
    const snapshot = await q.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TeacherLabel[];
  } catch (error: any) {
    // Fallback
    const qFallback = db.collection('teacherLabels').where('teacherId', '==', teacherId);
    const snapshot = await qFallback.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as TeacherLabel).sort((a, b) => a.name.localeCompare(b.name));
  }
};
