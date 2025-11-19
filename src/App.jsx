import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Mail, Lock, Loader, LogOut } from 'lucide-react';

const KardiumAuth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailValidating, setEmailValidating] = useState(false);
  const [emailValid, setEmailValid] = useState(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Firebase config - Replace with your actual Firebase config
  const firebaseConfig = {
  apiKey: "AIzaSyAUc2-2PBZh75KBYBo_Mm1_bmq_-soUfYo",
  authDomain: "kardium-login.firebaseapp.com",
  projectId: "kardium-login",
  storageBucket: "kardium-login.firebasestorage.app",
  messagingSenderId: "248657302598",
  appId: "1:248657302598:web:fa799f1ffe70db6a48e647",
  measurementId: "G-9KS21HC37Z"
};

  // Initialize Firebase
  useEffect(() => {
    const initFirebase = async () => {
      const { initializeApp } = await import('firebase/app');
      const { getAuth, onAuthStateChanged } = await import('firebase/auth');
      const { getFirestore } = await import('firebase/firestore');
      
      const app = initializeApp(firebaseConfig);
      window.firebaseAuth = getAuth(app);
      window.firebaseDb = getFirestore(app);

      // Listen for auth state changes
      onAuthStateChanged(window.firebaseAuth, (user) => {
        if (user && user.emailVerified) {
          setIsLoggedIn(true);
          setCurrentUser(user);
        } else {
          setIsLoggedIn(false);
          setCurrentUser(null);
        }
      });
    };
    
    initFirebase();
  }, []);

  // Real email validation
  const validateEmailReal = async (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, reason: 'Invalid email format' };
    }

    setEmailValidating(true);
    
    try {
      const response = await fetch(
        `http://localhost:3001/validate-email?email=${encodeURIComponent(email)}`
      );
      
      if (!response.ok) {
        console.error('API response not ok:', response.status);
        setEmailValidating(false);
        return { valid: false, reason: 'Could not validate email' };
      }
      
      const data = await response.json();
      
      const deliverability = data.email_deliverability;
      const quality = data.email_quality;
      
      const isDeliverable = deliverability?.status === 'deliverable';
      const isFormatValid = deliverability?.is_format_valid === true;
      const notDisposable = quality?.is_disposable === false;
      
      if (isDeliverable && isFormatValid && notDisposable) {
        setEmailValidating(false);
        return { valid: true, data };
      } else {
        setEmailValidating(false);
        let reason = 'Invalid email address';
        
        if (quality?.is_disposable === true) {
          reason = 'Disposable email addresses are not allowed';
        } else if (deliverability?.status === 'undeliverable') {
          reason = 'Email address does not exist';
        } else if (quality?.is_username_suspicious === true) {
          reason = 'This email appears suspicious';
        }
        
        return { valid: false, reason };
      }
    } catch (err) {
      console.error('Email validation error:', err);
      setEmailValidating(false);
      return { valid: false, reason: 'Could not validate email. Please try again.' };
    }
  };

  const handleEmailBlur = async () => {
    if (email) {
      const result = await validateEmailReal(email);
      setEmailValid(result.valid);
      if (!result.valid) {
        setError(result.reason);
      } else {
        setError('');
      }
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const emailCheck = await validateEmailReal(email);
      if (!emailCheck.valid) {
        setError(emailCheck.reason);
        setLoading(false);
        return;
      }

      const { createUserWithEmailAndPassword, sendEmailVerification } = await import('firebase/auth');
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');

      const userCredential = await createUserWithEmailAndPassword(
        window.firebaseAuth,
        email,
        password
      );

      await sendEmailVerification(userCredential.user);

      await setDoc(doc(window.firebaseDb, 'users', userCredential.user.uid), {
        email: email,
        createdAt: serverTimestamp(),
        emailVerified: false,
        lastLogin: serverTimestamp()
      });

      setVerificationSent(true);
      setSuccess('Account created! Please check your email to verify your account.');
      setLoading(false);
    } catch (err) {
      setLoading(false);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please login instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message);
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');

      const userCredential = await signInWithEmailAndPassword(
        window.firebaseAuth,
        email,
        password
      );

      if (!userCredential.user.emailVerified) {
        setError('Please verify your email before logging in. Check your inbox.');
        const { signOut } = await import('firebase/auth');
        await signOut(window.firebaseAuth);
        setLoading(false);
        return;
      }

      await updateDoc(doc(window.firebaseDb, 'users', userCredential.user.uid), {
        lastLogin: serverTimestamp(),
        emailVerified: true
      });

      setSuccess('Successfully logged in!');
      setLoading(false);
      // isLoggedIn will be set by the auth state listener
    } catch (err) {
      setLoading(false);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else {
        setError(err.message);
      }
    }
  };

  const handleLogout = async () => {
    try {
      const { signOut } = await import('firebase/auth');
      await signOut(window.firebaseAuth);
      setIsLoggedIn(false);
      setCurrentUser(null);
      setEmail('');
      setPassword('');
      setSuccess('Logged out successfully');
    } catch (err) {
      setError('Failed to log out');
    }
  };

  const resendVerification = async () => {
    try {
      const { sendEmailVerification } = await import('firebase/auth');
      const user = window.firebaseAuth.currentUser;
      if (user) {
        await sendEmailVerification(user);
        setSuccess('Verification email sent! Please check your inbox.');
      }
    } catch (err) {
      setError('Failed to send verification email. Please try again.');
    }
  };

  // If logged in, show dashboard
  if (isLoggedIn) {
    return (
      <iframe
        src="dashboard.html"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          margin: 0,
          padding: 0
        }}
        title="Kardium Dashboard"
      />
    );
  }

  // Login/Signup form
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Kardium</h1>
          <p className="text-gray-600">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        )}

        {verificationSent && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700 text-sm mb-2">
              Didn't receive the email?
            </p>
            <button
              onClick={resendVerification}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
            >
              Resend verification email
            </button>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailValid(null);
                  setError('');
                }}
                onBlur={handleEmailBlur}
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="you@example.com"
                required
              />
              {emailValidating && (
                <Loader className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 animate-spin" size={20} />
              )}
              {emailValid === true && !emailValidating && (
                <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500" size={20} />
              )}
              {emailValid === false && !emailValidating && (
                <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500" size={20} />
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            onClick={(e) => {
              e.preventDefault();
              if (isLogin) handleLogin(e);
              else handleSignUp(e);
            }}
            disabled={loading || emailValidating}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader className="animate-spin" size={20} />}
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setSuccess('');
              setVerificationSent(false);
            }}
            className="text-purple-600 hover:text-purple-800 font-medium"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Login'}
          </button>
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-sm text-gray-700 mb-2">Setup Instructions:</h3>
          <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
            <li>Create a Firebase project at console.firebase.google.com</li>
            <li>Enable Email/Password authentication</li>
            <li>Enable Firestore Database</li>
            <li>Replace Firebase config values in the code</li>
            <li>Make sure dashboard.html is in your public folder</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default KardiumAuth;