import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from './services/firebase';
import { AdminDashboard } from './components/AdminDashboard';
import { PatientView } from './components/PatientView';
import { Login } from './components/Login';
import { AlertCircle, LogOut, Moon, Sun } from 'lucide-react';
import { Button } from './components/ui/Button';

// Configuration: Authorized Admin Email
const ADMIN_EMAIL = 'gerito.diseno@gmail.com';

const App: React.FC = () => {
  const [currentHash, setCurrentHash] = useState(window.location.hash);
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // 1. Handle Routing based on Hash
    const handleHashChange = () => {
      setCurrentHash(window.location.hash);
    };
    window.addEventListener('hashchange', handleHashChange);

    // 2. Handle Real Authentication State
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
            setIsAuthorized(currentUser.email === ADMIN_EMAIL);
        } else {
            setIsAuthorized(false);
        }
        setLoadingAuth(false);
    });

    // 3. Check System Dark Mode preference or LocalStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setDarkMode(true);
        document.documentElement.classList.add('dark');
    } else {
        setDarkMode(false);
        document.documentElement.classList.remove('dark');
    }

    return () => {
        window.removeEventListener('hashchange', handleHashChange);
        unsubscribeAuth();
    };
  }, []);

  const toggleDarkMode = () => {
      setDarkMode(!darkMode);
      if (!darkMode) {
          document.documentElement.classList.add('dark');
          localStorage.setItem('theme', 'dark');
      } else {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('theme', 'light');
      }
  };

  const isPatientView = currentHash.startsWith('#appt-');
  const appointmentId = isPatientView ? currentHash.replace('#appt-', '') : '';

  const handleBackToAdmin = () => {
    window.location.hash = '';
  };

  const handleLogout = async () => {
      try {
          await signOut(auth);
      } catch (error) {
          console.error("Error logging out:", error);
      }
  };

  // Render Theme Toggle Button (Floating)
  const ThemeToggle = () => (
      <button 
        onClick={toggleDarkMode}
        className="fixed bottom-4 left-4 z-50 p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg text-gray-800 dark:text-yellow-400 hover:scale-110 transition-transform border border-gray-200 dark:border-gray-700"
        title="Cambiar Tema"
      >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
  );

  if (loadingAuth) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
              <div className="animate-pulse flex flex-col items-center">
                  <div className="w-12 h-12 bg-primary-200 dark:bg-primary-900 rounded-full mb-4"></div>
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
          </div>
      );
  }

  // 1. Patient View (Public)
  if (isPatientView) {
      return (
        <>
            <PatientView 
                appointmentId={appointmentId} 
                onBack={handleBackToAdmin} 
                isPublicView={true} // New prop to hide 'X'
            />
            <ThemeToggle />
        </>
      );
  }

  // 2. Not Logged In
  if (!user) {
      return (
        <>
            <Login />
            <ThemeToggle />
        </>
      );
  }

  // 3. Unauthorized
  if (!isAuthorized) {
      return (
          <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center p-4">
              <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl p-8 max-w-md w-full text-center border dark:border-gray-700">
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Acceso Denegado</h2>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                      El correo <strong>{user.email}</strong> no tiene permisos de administrador.
                  </p>
                  <Button fullWidth onClick={handleLogout} variant="secondary">
                      <LogOut className="w-4 h-4 mr-2" /> Cerrar Sesión
                  </Button>
              </div>
              <ThemeToggle />
          </div>
      );
  }

  // 4. Admin View
  return (
    <>
        <AdminDashboard onLogout={handleLogout} />
        <ThemeToggle />
    </>
  );
};

export default App;