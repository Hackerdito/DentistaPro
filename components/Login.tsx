import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';

interface LoginProps {
    onLogin?: () => void; // Optional now as Auth state is handled in App
}

export const Login: React.FC<LoginProps> = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    setIsLoading(true);
    setErrorMsg('');
    
    try {
        await signInWithPopup(auth, googleProvider);
        // Authentication state change is handled in App.tsx via onAuthStateChanged
    } catch (error: any) {
        console.error("Login Error:", error);
        setErrorMsg("Error al iniciar sesión. Intenta nuevamente.");
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=2068&auto=format&fit=crop')",
        }}
      >
        <div className="absolute inset-0 bg-teal-900/40 backdrop-blur-sm"></div>
      </div>

      {/* Liquid Glass Card */}
      <div className="relative z-10 w-full max-w-md p-8 rounded-3xl border border-white/20 shadow-2xl bg-white/10 backdrop-blur-xl animate-in fade-in zoom-in duration-500">
        
        {/* Logo / Icon */}
        <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30 mb-4 shadow-inner">
                <span className="text-4xl">🦷</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight text-center drop-shadow-md">
                DentistPro
            </h1>
            <p className="text-white/80 mt-2 text-center text-sm font-light">
                Gestión inteligente para tu consultorio
            </p>
        </div>

        {/* Login Button */}
        <div className="space-y-4">
            <button 
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full bg-white text-gray-800 font-semibold py-3.5 px-6 rounded-xl shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-3 group disabled:opacity-70 disabled:cursor-wait"
            >
                {isLoading ? (
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin"></div>
                ) : (
                    <img 
                        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                        alt="Google" 
                        className="w-6 h-6"
                    />
                )}
                <span className="group-hover:text-primary-600 transition-colors">
                    {isLoading ? 'Conectando...' : 'Iniciar sesión con Google'}
                </span>
            </button>
            
            {errorMsg && (
                <div className="bg-red-500/20 border border-red-500/50 p-3 rounded-lg text-center">
                    <p className="text-white text-sm">{errorMsg}</p>
                </div>
            )}

            <div className="text-center mt-6">
                <p className="text-xs text-white/50">
                    Modo seguro • Encriptación SSL
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};