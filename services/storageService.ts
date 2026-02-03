import { Appointment, NewAppointmentDTO, AppointmentStatus, ChatMessage } from '../types';
import { 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    onSnapshot, 
    query, 
    getDoc,
    arrayUnion
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION_NAME = 'appointments';

export const StorageService = {
  // Subscribe to real-time updates (Admin Dashboard)
  subscribeToAppointments: (callback: (data: Appointment[]) => void, onError?: (error: any) => void) => {
    const q = query(collection(db, COLLECTION_NAME));
    
    return onSnapshot(q, (snapshot) => {
      const appointments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Appointment[];
      
      // Robust Client-side sort: First by Date, then by Time
      appointments.sort((a, b) => {
          const dateA = a.date || '';
          const dateB = b.date || '';
          const dateCompare = dateA.localeCompare(dateB);
          
          if (dateCompare !== 0) return dateCompare;
          
          const timeA = a.time || '';
          const timeB = b.time || '';
          return timeA.localeCompare(timeB);
      });

      callback(appointments);
    }, (error) => {
        console.error("Error fetching appointments:", error);
        if (onError) onError(error);
    });
  },

  // Get single appointment (Patient View - Public Access)
  getAppointmentById: async (id: string): Promise<Appointment | undefined> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Appointment;
      } else {
        return undefined;
      }
    } catch (error) {
      console.error("Error getting document:", error);
      return undefined;
    }
  },

  createAppointment: async (dto: NewAppointmentDTO) => {
    try {
        const newAppointment = {
            ...dto,
            status: AppointmentStatus.SCHEDULED,
            createdAt: Date.now(),
            messages: [] // Initialize empty chat
        };
        await addDoc(collection(db, COLLECTION_NAME), newAppointment);
    } catch (error: any) {
        console.error("Error creating appointment:", error);
        if (error.code === 'permission-denied') {
            alert("No tienes permiso para crear citas. Asegúrate de estar logueado como administrador.");
        }
        throw error;
    }
  },

  updateAppointment: async (id: string, updates: Partial<Appointment>) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, updates);
    } catch (error) {
        console.error("Error updating appointment:", error);
    }
  },

  addMessage: async (appointmentId: string, message: Omit<ChatMessage, 'id'>) => {
      try {
          const docRef = doc(db, COLLECTION_NAME, appointmentId);
          const newMessage: ChatMessage = {
              ...message,
              id: Date.now().toString()
          };
          await updateDoc(docRef, {
              messages: arrayUnion(newMessage)
          });
      } catch (error) {
          console.error("Error sending message:", error);
      }
  },

  deleteAppointment: async (id: string) => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
        console.error("Error deleting appointment:", error);
    }
  }
};