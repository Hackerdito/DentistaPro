import React, { useState, useEffect, useRef } from 'react';
import { Plus, QrCode, Trash2, Calendar, MessageSquare, AlertCircle, LogOut, X, Phone, Mail, Share2, Eye, ExternalLink, Search, Send, User, Pencil, LayoutDashboard, History, Menu, ChevronLeft } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import es from 'date-fns/locale/es';
import { Appointment, AppointmentStatus, ChatMessage } from '../types';
import { StorageService } from '../services/storageService';
import { Button } from './ui/Button';
import { PatientView } from './PatientView';

interface AdminDashboardProps {
    onLogout: () => void;
}

const TREATMENT_OPTIONS = [
    'Limpieza General',
    'Ortodoncia',
    'Extracción',
    'Blanqueamiento',
    'Revisión Rutinaria'
];

type ViewState = 'agenda' | 'history' | 'dashboard';

// Helper to parse date string (YYYY-MM-DD) to local date object to avoid timezone offsets
const parseLocalDate = (dateString: string) => {
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Navigation State
  const [currentView, setCurrentView] = useState<ViewState>('agenda');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar toggle

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
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
    customTreatment: ''
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

  // Filter Logic based on current View and Search
  useEffect(() => {
      let baseList = appointments;
      const today = new Date().toISOString().split('T')[0];

      // Logic for Views
      if (currentView === 'agenda') {
          // Show upcoming or today
          baseList = appointments.filter(a => a.date >= today && a.status !== AppointmentStatus.COMPLETED && a.status !== AppointmentStatus.CANCELLED);
      } else if (currentView === 'history') {
          // Show past or completed/cancelled
          baseList = appointments.filter(a => a.date < today || a.status === AppointmentStatus.COMPLETED || a.status === AppointmentStatus.CANCELLED);
      } else if (currentView === 'dashboard') {
          baseList = []; // Dashboard handles its own data
      }

      if (!searchTerm.trim()) {
          setFilteredAppointments(baseList);
          return;
      }

      const lowerTerm = searchTerm.toLowerCase();
      const filtered = baseList.filter(appt => 
        appt.patientName.toLowerCase().includes(lowerTerm) ||
        appt.patientEmail?.toLowerCase().includes(lowerTerm) ||
        appt.patientPhone?.includes(lowerTerm)
      );
      setFilteredAppointments(filtered);
  }, [searchTerm, appointments, currentView]);

  useEffect(() => {
      if (isChatOpen) {
          adminChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
  }, [isChatOpen, appointments]);

  const handleOpenCreateModal = () => {
      setEditingId(null);
      setFormData({ 
            patientName: '', 
            patientEmail: '', 
            patientPhone: '', 
            date: '', 
            time: '', 
            treatmentType: 'Limpieza General',
            customTreatment: ''
      });
      setIsModalOpen(true);
  };

  const handleEditClick = (appt: Appointment) => {
      const isStandardTreatment = TREATMENT_OPTIONS.includes(appt.treatmentType);
      
      setFormData({
          patientName: appt.patientName,
          patientEmail: appt.patientEmail || '',
          patientPhone: appt.patientPhone || '',
          date: appt.date,
          time: appt.time,
          treatmentType: isStandardTreatment ? appt.treatmentType : 'manual',
          customTreatment: isStandardTreatment ? '' : appt.treatmentType
      });
      setEditingId(appt.id);
      setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const finalTreatment = formData.treatmentType === 'manual' 
            ? formData.customTreatment 
            : formData.treatmentType;

        if (!finalTreatment.trim()) return alert("Por favor especifica el tratamiento.");

        const payload = {
            patientName: formData.patientName,
            patientEmail: formData.patientEmail,
            patientPhone: formData.patientPhone,
            date: formData.date,
            time: formData.time,
            treatmentType: finalTreatment
        };

        if (editingId) {
            await StorageService.updateAppointment(editingId, payload);
        } else {
            await StorageService.createAppointment(payload);
        }

        setIsModalOpen(false);
        setEditingId(null);
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
        alert("Error al guardar la cita.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta cita de forma permanente?')) {
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

  const handleShareWhatsApp = (appt: Appointment) => {
      if (!appt.patientPhone) return alert('No hay teléfono registrado');
      const url = `${window.location.href.split('#')[0]}#appt-${appt.id}`;
      const text = `Hola ${appt.patientName}, aquí están los detalles de tu cita dental.\n\n📅 Fecha: ${appt.date}\n⏰ Hora: ${appt.time}\n🦷 Tratamiento: ${appt.treatmentType}\n\n🔗 Para ver tu CÓDIGO QR de acceso, haz clic aquí: ${url}`;
      window.open(`https://wa.me/${appt.patientPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSendEmail = (appt: Appointment) => {
      if (!appt.patientEmail) return alert('No hay email registrado');
      const url = `${window.location.href.split('#')[0]}#appt-${appt.id}`;
      const subject = `Recordatorio Cita Dental - ${appt.date}`;
      const body = `Hola ${appt.patientName},\n\nTu cita está confirmada.\n\nFecha: ${appt.date}\nHora: ${appt.time}\nTratamiento: ${appt.treatmentType}\n\nPuedes ver tu CÓDIGO QR y gestionar tu cita en el siguiente enlace:\n${url}\n\n¡Te esperamos!`;
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
              <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[2rem] relative bg-white dark:bg-dark-card">
                  <PatientView appointmentId={previewId} onBack={() => setPreviewId(null)} isPublicView={false} />
              </div>
          </div>
      );
  }

  // Dashboard Statistics Component
  const DashboardStats = () => {
      const totalAppointments = appointments.length;
      const cancelled = appointments.filter(a => a.status === AppointmentStatus.CANCELLED).length;
      const completed = appointments.filter(a => a.status === AppointmentStatus.COMPLETED || (a.date < new Date().toISOString().split('T')[0] && a.status === AppointmentStatus.SCHEDULED)).length;
      
      const treatmentCounts = appointments.reduce((acc, curr) => {
          acc[curr.treatmentType] = (acc[curr.treatmentType] || 0) + 1;
          return acc;
      }, {} as Record<string, number>);

      return (
          <div className="space-y-8 animate-in fade-in duration-500">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Resumen General</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Histórico</p>
                      <p className="text-4xl font-bold text-gray-900 dark:text-white mt-2">{totalAppointments}</p>
                  </div>
                  <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Citas Exitosas/Pasadas</p>
                      <p className="text-4xl font-bold text-emerald-600 mt-2">{completed}</p>
                  </div>
                  <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Canceladas</p>
                      <p className="text-4xl font-bold text-red-500 mt-2">{cancelled}</p>
                  </div>
              </div>

              <div className="bg-white dark:bg-dark-card p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Tratamientos Más Solicitados</h3>
                  <div className="space-y-4">
                      {Object.entries(treatmentCounts)
                        .sort(([,a], [,b]) => (b as number) - (a as number))
                        .map(([treatment, count]) => (
                          <div key={treatment} className="flex items-center gap-4">
                              <div className="flex-1">
                                  <div className="flex justify-between mb-1">
                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{treatment}</span>
                                      <span className="text-sm text-gray-500 dark:text-gray-400">{count} citas</span>
                                  </div>
                                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
                                      <div 
                                          className="bg-primary-600 h-2.5 rounded-full transition-all duration-1000" 
                                          style={{ width: `${totalAppointments > 0 ? ((count as number) / totalAppointments) * 100 : 0}%` }}
                                      ></div>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex transition-colors duration-300">
      
      {/* Sidebar - Desktop */}
      <aside className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-dark-card border-r dark:border-gray-700 transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0
      `}>
          <div className="p-6 h-full flex flex-col">
              <div className="flex items-center gap-3 mb-10">
                  <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/20">
                      <span className="text-white font-bold text-xl">D</span>
                  </div>
                  <div>
                      <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">DentistPro</h1>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Admin</p>
                  </div>
              </div>

              <nav className="space-y-2 flex-1">
                  <button 
                      onClick={() => { setCurrentView('agenda'); setIsSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'agenda' ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  >
                      <Calendar className="w-5 h-5" />
                      <span className="font-medium">Agenda Actual</span>
                  </button>
                  <button 
                      onClick={() => { setCurrentView('history'); setIsSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'history' ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  >
                      <History className="w-5 h-5" />
                      <span className="font-medium">Historial Citas</span>
                  </button>
                  <button 
                      onClick={() => { setCurrentView('dashboard'); setIsSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'dashboard' ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  >
                      <LayoutDashboard className="w-5 h-5" />
                      <span className="font-medium">Dashboard</span>
                  </button>
              </nav>

              <div className="pt-6 border-t dark:border-gray-700">
                  <button 
                      onClick={() => { if(confirm("¿Cerrar sesión?")) onLogout(); }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                      <LogOut className="w-5 h-5" />
                      <span className="font-medium">Cerrar Sesión</span>
                  </button>
              </div>
          </div>
      </aside>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        
        {/* Mobile Header */}
        <header className="bg-white dark:bg-dark-card shadow-sm sticky top-0 z-10 border-b dark:border-gray-700 md:hidden p-4 flex justify-between items-center">
             <div className="flex items-center gap-3">
                 <button onClick={() => setIsSidebarOpen(true)} className="text-gray-600 dark:text-gray-300">
                     <Menu className="w-6 h-6" />
                 </button>
                 <span className="font-bold text-lg dark:text-white">DentistPro</span>
             </div>
             {currentView === 'agenda' && (
                 <Button size="sm" onClick={handleOpenCreateModal}>
                     <Plus className="w-5 h-5" />
                 </Button>
             )}
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
            
            {/* Header for Desktop */}
            <div className="hidden md:flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {currentView === 'agenda' ? 'Agenda de Pacientes' : 
                         currentView === 'history' ? 'Historial de Citas' : 'Dashboard Estadístico'}
                    </h2>
                    <p className="text-gray-500 text-sm">
                        {currentView === 'agenda' ? 'Administra las citas próximas.' : 
                         currentView === 'history' ? 'Consulta citas pasadas o completadas.' : 'Métricas de tu consultorio.'}
                    </p>
                </div>
                {currentView === 'agenda' && (
                    <div className="flex gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Buscar..." 
                                className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleOpenCreateModal}>
                            <Plus className="w-4 h-4 mr-2" /> Nueva Cita
                        </Button>
                    </div>
                )}
                {currentView === 'history' && (
                     <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar en historial..." 
                            className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                )}
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center mb-6">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-red-800 dark:text-red-300 font-bold mb-2">Error</h3>
                    <p className="text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            {/* VIEWS RENDER */}
            {currentView === 'dashboard' ? (
                <DashboardStats />
            ) : (
                /* List for Agenda and History */
                <>
                {loading ? (
                     <div className="text-center py-12">
                         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                         <p className="text-gray-400">Cargando...</p>
                     </div>
                ) : filteredAppointments.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-gray-700">
                        <Calendar className="w-16 h-16 text-gray-200 dark:text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No hay citas</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            {currentView === 'agenda' ? 'No tienes citas próximas agendadas.' : 'No hay historial de citas.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {filteredAppointments.map((appt) => (
                            <div key={appt.id} className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all">
                                <div className="p-6">
                                    <div className="flex justify-between items-start flex-col md:flex-row gap-6">
                                        
                                        {/* Info */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appt.status)}`}>
                                                    {appt.status}
                                                </span>
                                                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{appt.treatmentType}</span>
                                            </div>
                                            
                                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{appt.patientName}</h3>
                                            
                                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 mt-3">
                                                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-lg">
                                                    <Calendar className="w-4 h-4 text-primary-600" /> 
                                                    {format(parseLocalDate(appt.date), 'dd/MM/yyyy', { locale: es })}
                                                </div>
                                                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-lg">
                                                    <span className="font-bold text-gray-900 dark:text-white">{appt.time}</span>
                                                </div>
                                            </div>
                                            
                                            {/* Contact Info */}
                                            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                                                {appt.patientPhone && (
                                                    <div className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200">
                                                        <Phone className="w-3.5 h-3.5" /> {appt.patientPhone}
                                                    </div>
                                                )}
                                                {appt.patientEmail && (
                                                    <div className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200">
                                                        <Mail className="w-3.5 h-3.5" /> {appt.patientEmail}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions - UPDATED: Mail and Delete are full buttons now */}
                                        <div className="flex flex-wrap gap-2 w-full md:w-auto md:flex-col lg:flex-row md:items-end justify-end">
                                            {appt.status !== AppointmentStatus.CANCELLED && (
                                                <>
                                                    <Button variant="secondary" size="sm" onClick={() => handleEditClick(appt)}>
                                                        <Pencil className="w-4 h-4 mr-2" /> Editar
                                                    </Button>
                                                    
                                                    <Button variant="secondary" size="sm" onClick={() => setSelectedQr(appt.id)}>
                                                        <QrCode className="w-4 h-4 mr-2" /> QR
                                                    </Button>
                                                    
                                                    <Button variant="outline" size="sm" onClick={() => setIsChatOpen(appt.id)} className="relative">
                                                        <MessageSquare className="w-4 h-4 mr-2" /> Chat
                                                        {(appt.messages?.length || 0) > 0 && (
                                                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                                            </span>
                                                        )}
                                                    </Button>

                                                    {/* NEW: Full Button for Email */}
                                                    {appt.patientEmail && (
                                                        <Button variant="secondary" size="sm" onClick={() => handleSendEmail(appt)} className="text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50">
                                                            <Mail className="w-4 h-4 mr-2" /> Enviar
                                                        </Button>
                                                    )}

                                                    {/* WhatsApp Button (Icon only remains for space or could be button too) */}
                                                    {appt.patientPhone && (
                                                        <button onClick={() => handleShareWhatsApp(appt)} className="flex items-center justify-center px-3 py-1.5 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 dark:border-green-900/50 dark:hover:bg-green-900/20 text-sm font-medium transition-colors" title="Enviar WhatsApp">
                                                            <Share2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                            
                                            {/* NEW: Full Button for Delete */}
                                            <Button variant="secondary" size="sm" onClick={() => handleDelete(appt.id)} className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20">
                                                <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                </>
            )}
        </main>
      </div>

      {/* New/Edit Appointment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto border dark:border-gray-700">
            <div className="px-6 py-4 bg-primary-600 flex justify-between items-center sticky top-0">
              <h3 className="text-lg font-bold text-white">
                  {editingId ? 'Editar Cita' : 'Nueva Cita'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                    {TREATMENT_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
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
                <Button fullWidth type="submit">
                    {editingId ? 'Guardar Cambios' : 'Crear Cita'}
                </Button>
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