import React, { useState, useEffect, useRef } from 'react';
import { Plus, QrCode, Trash2, Calendar, MessageSquare, AlertCircle, LogOut, X, Phone, Mail, Share2, Eye, ExternalLink, Search, Send, User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { Appointment, AppointmentStatus, ChatMessage } from '../types';
import { StorageService } from '../services/storageService';
import { Button } from './ui/Button';
import { PatientView } from './PatientView';

interface AdminDashboardProps {
    onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQr, setSelectedQr] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  
  // Chat Modal State
  const [isChatOpen, setIsChatOpen] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const adminChatEndRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    patientName: '',
    patientEmail: '',
    patientPhone: '',
    date: '',
    time: '',
    treatmentType: 'Limpieza General',
    customTreatment: '' // Field for manual entry
  });

  useEffect(() => {
    const unsubscribe = StorageService.subscribeToAppointments(
        (data) => {
            setAppointments(data);
            setLoading(false);
            setError(null);
        },
        (err) => {
            console.error(err);
            setLoading(false);
            setError("Error al cargar las citas.");
        }
    );
    return () => unsubscribe();
  }, []);

  // Filter Logic
  useEffect(() => {
      if (!searchTerm.trim()) {
          setFilteredAppointments(appointments);
          return;
      }
      const lowerTerm = searchTerm.toLowerCase();
      const filtered = appointments.filter(appt => 
        appt.patientName.toLowerCase().includes(lowerTerm) ||
        appt.patientEmail?.toLowerCase().includes(lowerTerm) ||
        appt.patientPhone?.includes(lowerTerm)
      );
      setFilteredAppointments(filtered);
  }, [searchTerm, appointments]);

  // Auto-scroll admin chat when opened or new messages arrive
  useEffect(() => {
      if (isChatOpen) {
          adminChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
  }, [isChatOpen, appointments]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const finalTreatment = formData.treatmentType === 'manual' 
            ? formData.customTreatment 
            : formData.treatmentType;

        if (!finalTreatment.trim()) return alert("Por favor especifica el tratamiento.");

        await StorageService.createAppointment({
            ...formData,
            treatmentType: finalTreatment
        });
        setIsModalOpen(false);
        setFormData({ 
            patientName: '', 
            patientEmail: '', 
            patientPhone: '', 
            date: '', 
            time: '', 
            treatmentType: 'Limpieza General',
            customTreatment: ''
        });
    } catch (e) {
        alert("Error al crear la cita.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta cita?')) {
      await StorageService.deleteAppointment(id);
    }
  };

  const handleSendChat = async (appointmentId: string) => {
      if (!chatMessage.trim()) return;
      await StorageService.addMessage(appointmentId, {
          sender: 'doctor',
          text: chatMessage,
          timestamp: Date.now()
      });
      setChatMessage('');
  };

  const handleLogoutClick = () => {
    if(confirm("¿Cerrar sesión?")) onLogout();
  };

  const handleShareWhatsApp = (appt: Appointment) => {
      if (!appt.patientPhone) return alert('No hay teléfono registrado');
      const text = `Hola ${appt.patientName}, te recordamos tu cita dental para el ${appt.date} a las ${appt.time}. Puedes ver los detalles aquí: ${window.location.href.split('#')[0]}#appt-${appt.id}`;
      window.open(`https://wa.me/${appt.patientPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSendEmail = (appt: Appointment) => {
      if (!appt.patientEmail) return alert('No hay email registrado');
      const subject = `Recordatorio Cita Dental - ${appt.date}`;
      const body = `Hola ${appt.patientName},\n\nTu cita está confirmada para el ${appt.date} a las ${appt.time}.\nTratamiento: ${appt.treatmentType}.\n\nVer detalles y código QR aquí: ${window.location.href.split('#')[0]}#appt-${appt.id}`;
      window.location.href = `mailto:${appt.patientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.SCHEDULED: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case AppointmentStatus.COMPLETED: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case AppointmentStatus.CANCELLED: return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
  };

  const currentUrl = window.location.href.split('#')[0];

  // Preview Logic
  if (previewId) {
      return (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-full max-w-md h-full max-h-[90vh] overflow-hidden rounded-[2rem] relative">
                  {/* Pass isPublicView={false} so Admin sees the X button to close preview */}
                  <PatientView appointmentId={previewId} onBack={() => setPreviewId(null)} isPublicView={false} />
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg pb-12 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-dark-card shadow-sm sticky top-0 z-10 border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/20">
               <span className="text-white font-bold text-xl">D</span>
            </div>
            <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">DentistPro</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Panel de Administración</p>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative w-full sm:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input 
                  type="text" 
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors" 
                  placeholder="Buscar paciente..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="w-5 h-5 mr-1" />
                <span className="hidden md:inline">Nueva Cita</span>
                <span className="md:hidden">Crear</span>
            </Button>
            <button 
                onClick={handleLogoutClick}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Cerrar Sesión"
            >
                <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Citas Hoy</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{appointments.filter(a => a.date === new Date().toISOString().split('T')[0]).length}</p>
            </div>
            <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Pendientes</p>
                <p className="text-3xl font-bold text-primary-600">{appointments.filter(a => a.status === AppointmentStatus.SCHEDULED).length}</p>
            </div>
            <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Canceladas</p>
                <p className="text-3xl font-bold text-red-500">{appointments.filter(a => a.status === AppointmentStatus.CANCELLED).length}</p>
            </div>
        </div>

        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center justify-between">
            <span>Agenda de Pacientes</span>
            {searchTerm && <span className="text-sm font-normal text-gray-500">Resultados: {filteredAppointments.length}</span>}
        </h2>

        {/* Loading State */}
        {loading && (
             <div className="text-center py-12">
                 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                 <p className="text-gray-400">Cargando agenda...</p>
             </div>
        )}

        {/* Error State */}
        {error && !loading && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-red-800 dark:text-red-300 font-bold mb-2">Error de Conexión</h3>
                <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
        )}

        {/* Appointments List */}
        {!loading && !error && (
            <div className="grid gap-6">
            {filteredAppointments.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-dark-card rounded-xl shadow-sm">
                    <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No se encontraron citas.</p>
                </div>
            ) : (
                filteredAppointments.map((appt) => (
                <div key={appt.id} className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all">
                    <div className="p-6">
                    <div className="flex justify-between items-start flex-col md:flex-row gap-4">
                        
                        {/* Info */}
                        <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appt.status)}`}>
                            {appt.status}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">{appt.treatmentType}</span>
                        </div>
                        
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{appt.patientName}</h3>
                        
                        {/* Contact Info */}
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {appt.patientPhone && (
                                <div className="flex items-center gap-1">
                                    <Phone className="w-3.5 h-3.5" /> {appt.patientPhone}
                                </div>
                            )}
                            {appt.patientEmail && (
                                <div className="flex items-center gap-1">
                                    <Mail className="w-3.5 h-3.5" /> {appt.patientEmail}
                                </div>
                            )}
                        </div>

                        <div className="mt-3 flex items-center text-gray-600 dark:text-gray-300 gap-4 text-sm">
                            <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" /> 
                            {format(new Date(appt.date), 'dd/MM/yyyy')}
                            </span>
                            <span className="font-medium bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-800 dark:text-gray-200">
                                {appt.time}
                            </span>
                        </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 w-full md:w-auto">
                            <div className="flex items-center gap-2 self-end md:self-start">
                            {appt.status !== AppointmentStatus.CANCELLED && (
                                <>
                                    <Button 
                                        variant="secondary" 
                                        size="sm"
                                        onClick={() => setSelectedQr(appt.id)}
                                        title="Ver QR"
                                    >
                                        <QrCode className="w-4 h-4 mr-2" />
                                        QR
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsChatOpen(appt.id)}
                                        className="relative"
                                    >
                                        <MessageSquare className="w-4 h-4 mr-2" />
                                        Chat
                                        {/* Simple badge if messages exist (optional logic could be added for unread) */}
                                        {(appt.messages?.length || 0) > 0 && (
                                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                            </span>
                                        )}
                                    </Button>
                                </>
                            )}
                            <button 
                                onClick={() => handleDelete(appt.id)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Eliminar cita"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                            </div>
                            
                            {/* Share Actions */}
                            {appt.status !== AppointmentStatus.CANCELLED && (
                                <div className="flex gap-2 justify-end">
                                    {appt.patientPhone && (
                                        <button onClick={() => handleShareWhatsApp(appt)} className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 p-1.5 rounded" title="Enviar WhatsApp">
                                            <Share2 className="w-4 h-4" />
                                        </button>
                                    )}
                                    {appt.patientEmail && (
                                        <button onClick={() => handleSendEmail(appt)} className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-1.5 rounded" title="Enviar Email">
                                            <Mail className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    </div>
                </div>
                ))
            )}
            </div>
        )}
      </main>

      {/* New Appointment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto border dark:border-gray-700">
            <div className="px-6 py-4 bg-primary-600 flex justify-between items-center sticky top-0">
              <h3 className="text-lg font-bold text-white">Nueva Cita</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre Paciente</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej. Juan Pérez"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  value={formData.patientName}
                  onChange={e => setFormData({...formData, patientName: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono</label>
                    <input 
                      type="tel" 
                      placeholder="55 1234 5678"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                      value={formData.patientPhone}
                      onChange={e => setFormData({...formData, patientPhone: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <input 
                      type="email" 
                      placeholder="juan@email.com"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                      value={formData.patientEmail}
                      onChange={e => setFormData({...formData, patientEmail: e.target.value})}
                    />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                    <input 
                    type="date" 
                    required
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hora</label>
                    <input 
                    type="time" 
                    required
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                    value={formData.time}
                    onChange={e => setFormData({...formData, time: e.target.value})}
                    />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tratamiento</label>
                <select 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  value={formData.treatmentType}
                  onChange={e => setFormData({...formData, treatmentType: e.target.value})}
                >
                    <option>Limpieza General</option>
                    <option>Ortodoncia</option>
                    <option>Extracción</option>
                    <option>Blanqueamiento</option>
                    <option>Revisión Rutinaria</option>
                    <option value="manual">Otro (Especifique)</option>
                </select>
                {formData.treatmentType === 'manual' && (
                    <input 
                        type="text"
                        placeholder="Escribe el tratamiento..."
                        className="mt-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none animate-in fade-in slide-in-from-top-2"
                        value={formData.customTreatment}
                        onChange={e => setFormData({...formData, customTreatment: e.target.value})}
                        autoFocus
                    />
                )}
              </div>
              <div className="pt-2">
                <Button fullWidth type="submit">Crear Cita</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chat Modal (Admin Side) */}
      {isChatOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-dark-card w-full max-w-md h-[600px] flex flex-col rounded-2xl shadow-2xl overflow-hidden border dark:border-gray-700">
                <div className="bg-gray-100 dark:bg-gray-800 p-4 flex justify-between items-center border-b dark:border-gray-700">
                    <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                             <User className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                         </div>
                         <div>
                             <h3 className="font-bold text-gray-900 dark:text-white">
                                 {appointments.find(a => a.id === isChatOpen)?.patientName}
                             </h3>
                             <p className="text-xs text-gray-500 dark:text-gray-400">Chat con paciente</p>
                         </div>
                    </div>
                    <button onClick={() => setIsChatOpen(null)} className="text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
                    {/* Render messages or legacy comment */}
                    {(() => {
                        const appt = appointments.find(a => a.id === isChatOpen);
                        if (!appt) return null;

                        const messages = appt.messages || [];
                        const legacyComment = appt.patientComments;

                        return (
                            <>
                                {legacyComment && messages.length === 0 && (
                                    <div className="flex justify-start">
                                        <div className="max-w-[80%] rounded-2xl px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Nota original</p>
                                            {legacyComment}
                                        </div>
                                    </div>
                                )}
                                {messages.map((msg) => (
                                    <div key={msg.id} className={`flex ${msg.sender === 'doctor' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                                            msg.sender === 'doctor' 
                                            ? 'bg-blue-500 text-white rounded-tr-none' 
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none'
                                        }`}>
                                            {msg.text}
                                            <p className={`text-[10px] mt-1 text-right ${msg.sender === 'doctor' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                                {format(msg.timestamp, 'HH:mm')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={adminChatEndRef} />
                            </>
                        );
                    })()}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white dark:bg-dark-card border-t dark:border-gray-700">
                    <form 
                        onSubmit={(e) => {
                            e.preventDefault();
                            if(isChatOpen) handleSendChat(isChatOpen);
                        }} 
                        className="flex gap-2"
                    >
                        <input 
                            type="text" 
                            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-full px-4 py-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Escribe un mensaje..."
                            value={chatMessage}
                            onChange={(e) => setChatMessage(e.target.value)}
                        />
                        <button 
                            type="submit"
                            disabled={!chatMessage.trim()}
                            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
                        >
                            <Send className="w-5 h-5 ml-0.5" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
      )}

      {/* QR Modal */}
      {selectedQr && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-dark-card rounded-2xl p-8 max-w-sm w-full text-center relative border dark:border-gray-700">
                <button onClick={() => setSelectedQr(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X className="w-6 h-6" />
                </button>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Escanea para ver Cita</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Muestra esto al paciente para que acceda a los detalles.</p>
                
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-white border-2 border-gray-100 rounded-xl shadow-inner">
                        <QRCodeSVG 
                            value={`${currentUrl}#appt-${selectedQr}`} 
                            size={200}
                            level="H"
                            includeMargin={true}
                        />
                    </div>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs p-3 rounded-lg break-all">
                    Link: {currentUrl}#appt-{selectedQr}
                </div>
                <div className="mt-4 flex flex-col gap-3">
                    <Button onClick={() => setPreviewId(selectedQr)} fullWidth>
                        <Eye className="w-4 h-4 mr-2" /> Vista Previa (Ver Aquí)
                    </Button>
                    <Button variant="outline" fullWidth onClick={() => window.open(`${currentUrl}#appt-${selectedQr}`, '_blank')}>
                        <ExternalLink className="w-4 h-4 mr-2" /> Abrir en Nueva Pestaña
                    </Button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};