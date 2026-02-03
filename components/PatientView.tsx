import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, MapPin, MessageCircle, AlertTriangle, CheckCircle, Download, Mail, X, Send } from 'lucide-react';
import { Appointment, AppointmentStatus } from '../types';
import { StorageService } from '../services/storageService';
import { Button } from './ui/Button';
import { format } from 'date-fns';
import es from 'date-fns/locale/es';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

interface PatientViewProps {
  appointmentId: string;
  onBack: () => void;
  isPublicView?: boolean; // If true, hide the X close button
}

// Helper to parse date string (YYYY-MM-DD) to local date object to avoid timezone offsets
const parseLocalDate = (dateString: string) => {
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

export const PatientView: React.FC<PatientViewProps> = ({ appointmentId, onBack, isPublicView = true }) => {
  const [appointment, setAppointment] = useState<Appointment | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  
  // Chat State
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!appointmentId) return;

    const docRef = doc(db, 'appointments', appointmentId);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            setAppointment({ id: docSnap.id, ...docSnap.data() } as Appointment);
        } else {
            setAppointment(undefined);
        }
        setLoading(false);
    }, (error) => {
        console.error("Error fetching appointment:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [appointmentId]);

  useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [appointment?.messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (appointment && messageText.trim()) {
        await StorageService.addMessage(appointment.id, {
            sender: 'patient',
            text: messageText,
            timestamp: Date.now()
        });
        setMessageText('');
    }
  };

  const handleCancel = async () => {
    if (appointment && cancelReason.trim()) {
        await StorageService.updateAppointment(appointment.id, { 
            status: AppointmentStatus.CANCELLED,
            cancellationReason: cancelReason
        });
        setShowCancelModal(false);
    }
  };

  const handleResume = async () => {
     if (appointment) {
         if (confirm("¿Deseas reanudar (reactivar) esta cita?")) {
            await StorageService.updateAppointment(appointment.id, {
                status: AppointmentStatus.SCHEDULED,
                cancellationReason: undefined
            });
         }
     }
  };

  const handlePrint = () => {
      window.print();
  };

  const handleMailSelf = () => {
      if(!appointment) return;
      const subject = `Mi Cita Dental - ${appointment.date}`;
      const body = `Hola,\n\nGuardo los datos de mi cita:\nFecha: ${appointment.date}\nHora: ${appointment.time}\nTratamiento: ${appointment.treatmentType}\n\nClínica Dental Sonrisas`;
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
    );
  }

  if (!appointment) {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 text-center bg-gray-50 dark:bg-dark-bg">
            <div className="bg-white dark:bg-dark-card p-8 rounded-xl shadow-lg max-w-sm w-full relative border dark:border-gray-700">
                {!isPublicView && (
                    <button 
                        onClick={onBack}
                        className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                )}
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Cita no encontrada</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">El código QR no es válido o la cita ha sido eliminada.</p>
                {!isPublicView && (
                    <div className="mt-6">
                        <Button fullWidth onClick={onBack}>Volver</Button>
                    </div>
                )}
            </div>
        </div>
    );
  }

  const isCancelled = appointment.status === AppointmentStatus.CANCELLED;

  return (
    <div className="relative min-h-screen w-full print:h-auto print:bg-white">
      
      {/* 1. FIXED BACKGROUND LAYER (Stays still during scroll) */}
      {isPublicView && (
          <div className="fixed inset-0 z-0 print:hidden">
              <img 
                  src="https://images.pexels.com/photos/6627420/pexels-photo-6627420.jpeg" 
                  alt="Background" 
                  className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
          </div>
      )}

      {/* 2. SCROLLABLE CONTENT LAYER */}
      <div 
        className={`
            relative z-10 min-h-screen flex flex-col items-center 
            ${isPublicView ? 'justify-center py-4 sm:py-8' : 'justify-start py-0'} 
            print:p-0 print:block print:min-h-0
        `}
      >
        
        {/* Mobile-like Card Container */}
        <div className={`
                w-full max-w-md bg-white dark:bg-dark-card shadow-2xl relative flex flex-col overflow-hidden transition-colors duration-300
                ${isPublicView ? 'min-h-[650px] sm:rounded-[2.5rem]' : 'h-full rounded-none'}
                print:shadow-none print:max-w-none print:w-full print:rounded-none print:h-auto print:overflow-visible
        `}>
            
            {/* Close Button (X) - Only for Admin Preview */}
            {!isPublicView && (
                <button 
                    onClick={onBack}
                    className="absolute top-4 right-4 z-50 p-2 bg-black/20 hover:bg-black/40 backdrop-blur-sm rounded-full text-white transition-all print:hidden"
                    title="Cerrar vista"
                >
                    <X className="w-6 h-6" />
                </button>
            )}

            {/* Header Image/Banner - Updated with Login Image */}
            <div className="h-56 bg-primary-600 relative overflow-hidden print:h-auto print:bg-white print:text-black shrink-0 print:overflow-visible print:border-b print:border-gray-200 print:mb-4">
                {/* Updated Image Source */}
                <img 
                    src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=2068&auto=format&fit=crop" 
                    alt="Clinic" 
                    className="w-full h-full object-cover print:hidden" 
                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent z-10 print:hidden"></div>
                
                {/* Header Content */}
                {/* CHANGED: Increased bottom value to bottom-12 to move text up */}
                <div className="absolute bottom-10 left-6 z-20 text-white print:relative print:text-black print:p-4 print:left-0 print:bottom-auto w-full pr-6">
                    <p className="text-lg font-medium opacity-90 mb-0.5 print:hidden tracking-wide">Bienvenido,</p>
                    <h1 className="text-4xl font-bold tracking-tight shadow-sm print:shadow-none print:text-4xl print:mb-2">{appointment.patientName}</h1>
                    <p className="hidden print:block text-sm text-gray-500">Comprobante de Cita</p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-6 py-6 -mt-8 relative z-30 rounded-t-[2rem] bg-white dark:bg-dark-card border-t dark:border-t-0 print:mt-0 print:p-0 overflow-y-auto print:overflow-visible">
                
                {/* Status Badge */}
                <div className="flex justify-between items-center mb-6 print:justify-start print:mb-4">
                    <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm border ${
                        isCancelled 
                        ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900' 
                        : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-900'
                    }`}>
                        {appointment.status}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 print:ml-4">ID: {appointment.id.slice(0,6)}</span>
                </div>

                {/* Date & Time Card */}
                <div className="grid grid-cols-2 gap-4 mb-6 print:border print:border-gray-200 print:rounded-lg print:p-4 print:mb-4">
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 text-center print:bg-white print:border-none print:p-0 print:text-left shadow-sm">
                        <Calendar className="w-6 h-6 text-primary-600 dark:text-primary-400 mx-auto mb-2 print:hidden" />
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Fecha</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{format(parseLocalDate(appointment.date), 'dd MMM yyyy', { locale: es })}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 text-center print:bg-white print:border-none print:p-0 print:text-left shadow-sm">
                        <Clock className="w-6 h-6 text-primary-600 dark:text-primary-400 mx-auto mb-2 print:hidden" />
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Hora</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{appointment.time}</p>
                    </div>
                </div>

                {/* Details */}
                <div className="space-y-4 mb-8 print:mb-4">
                    <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors print:p-0">
                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 print:hidden">
                            <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">Clínica Dental Sonrisas</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Av. Siempre Viva 123, Ciudad</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors print:p-0">
                        <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center shrink-0 print:hidden">
                            <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">Tratamiento</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{appointment.treatmentType}</p>
                        </div>
                    </div>
                </div>

                {/* Actions (Hidden on Print) */}
                <div className="space-y-6 print:hidden">
                    
                    {/* Share Options */}
                    <div>
                        <p className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                            Obtén tu PDF o envía por mail tu cita
                        </p>
                        <div className="flex gap-3">
                            <Button variant="secondary" className="flex-1 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700" onClick={handlePrint}>
                                <Download className="w-4 h-4 mr-2" /> 
                                PDF
                            </Button>
                            <Button variant="secondary" className="flex-1 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700" onClick={handleMailSelf}>
                                <Mail className="w-4 h-4 mr-2" /> 
                                Correo
                            </Button>
                        </div>
                    </div>

                    {/* Chat Interface (iMessage Style) */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
                        <div className="p-3 bg-gray-100 dark:bg-gray-800 border-b dark:border-gray-700 flex items-center gap-2">
                             <MessageCircle className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                             <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Chat con el Doctor</span>
                        </div>
                        
                        <div className="h-48 overflow-y-auto p-4 space-y-3 bg-white dark:bg-gray-900/30">
                            {/* Empty State */}
                            {(!appointment.messages || appointment.messages.length === 0) && !appointment.patientComments && (
                                <p className="text-center text-xs text-gray-400 italic mt-4">Envía un mensaje si tienes dudas.</p>
                            )}
                            
                            {/* Legacy Comment Support */}
                            {appointment.patientComments && (!appointment.messages || appointment.messages.length === 0) && (
                                 <div className="flex justify-end">
                                    <div className="max-w-[85%] bg-primary-600 text-white px-3 py-2 rounded-2xl rounded-tr-none text-sm shadow-sm">
                                        {appointment.patientComments}
                                    </div>
                                 </div>
                            )}

                            {/* Messages */}
                            {appointment.messages?.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.sender === 'patient' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                                        msg.sender === 'patient' 
                                        ? 'bg-primary-600 text-white rounded-tr-none' 
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none'
                                    }`}>
                                        <p>{msg.text}</p>
                                        <p className={`text-[9px] mt-1 text-right ${msg.sender === 'patient' ? 'text-primary-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                            {format(msg.timestamp, 'HH:mm')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSendMessage} className="p-2 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 flex gap-2">
                            <input 
                                type="text" 
                                className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                                placeholder="Escribe aquí..."
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                disabled={isCancelled}
                            />
                            <button 
                                type="submit" 
                                disabled={!messageText.trim() || isCancelled}
                                className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white p-1.5 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>

                    {/* Cancel/Resume Buttons */}
                    <div className="pt-2 pb-8">
                        {isCancelled ? (
                            <div className="text-center">
                                <p className="text-red-600 text-sm mb-4 font-medium bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900">
                                    Motivo: {appointment.cancellationReason}
                                </p>
                                <Button fullWidth onClick={handleResume} variant="primary">
                                    Reanudar Cita
                                </Button>
                            </div>
                        ) : (
                            <Button fullWidth variant="danger" onClick={() => setShowCancelModal(true)}>
                                Cancelar Cita
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>

      </div>

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-4">
            <div className="bg-white dark:bg-dark-card w-full max-w-sm rounded-2xl p-6 animate-in slide-in-from-bottom-10 border dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Cancelar Cita</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Por favor cuéntanos por qué necesitas cancelar. Esto ayuda a la clínica a mejorar.
                </p>
                <textarea 
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-sm mb-4 focus:ring-2 focus:ring-red-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Escribe el motivo aquí..."
                    rows={3}
                    autoFocus
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                />
                <div className="flex gap-3">
                    <Button variant="secondary" fullWidth onClick={() => setShowCancelModal(false)} className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">Volver</Button>
                    <Button variant="danger" fullWidth onClick={handleCancel} disabled={!cancelReason.trim()}>Confirmar</Button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};