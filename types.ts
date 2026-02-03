export enum AppointmentStatus {
  SCHEDULED = 'PROGRAMADA',
  COMPLETED = 'COMPLETADA',
  CANCELLED = 'CANCELADA'
}

export interface ChatMessage {
  id: string;
  sender: 'doctor' | 'patient';
  text: string;
  timestamp: number;
}

export interface Appointment {
  id: string;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  date: string; // ISO string
  time: string;
  treatmentType: string;
  status: AppointmentStatus;
  doctorNotes?: string;
  patientComments?: string; // Legacy field, keeping for compatibility
  cancellationReason?: string;
  messages?: ChatMessage[]; // New Chat System
  createdAt: number;
}

export interface NewAppointmentDTO {
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  date: string;
  time: string;
  treatmentType: string;
}