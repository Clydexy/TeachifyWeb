import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app } from '../firebase';
import { motion } from 'framer-motion';

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = getAuth(app);
  
  useEffect(() => {
    document.title = 'Login | Teachify';
    // Redirect to appropriate dashboard if already logged in
    const authId = localStorage.getItem('authId');
    const isStudent = localStorage.getItem('isStudent') === 'true';
    if (authId) {
      navigate(isStudent ? '/dashboard' : '/teacher');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if user exists and get their role
      const db = getFirestore(app);
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        setError('User data not found');
        return;
      }

      const userData = userDoc.data();
      
      // Store auth ID and user type
      localStorage.setItem('authId', user.uid);
      localStorage.setItem('isStudent', userData.isStudent ? 'true' : 'false');

      if (userData.isStudent) {
        if (!userData.isActive) {
          // Store user ID in session storage temporarily for setup
          sessionStorage.setItem('tempAuthId', user.uid);
          navigate('/setup');
        } else {
          navigate('/dashboard');
        }
      } else {
        navigate('/teacher');
      }
    } catch (err) {
      setError('Invalid email or password');
      console.error('Authentication error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ backgroundColor: 'rgb(17, 24, 39)' }}
      animate={{ backgroundColor: 'rgb(243, 244, 246)' }}
      exit={{ backgroundColor: 'rgb(17, 24, 39)' }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex items-center justify-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white p-8 rounded-lg shadow-md w-96"
      >
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Welcome Back</h1>
        </div>
        
        {error && (
          <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to Home
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default LoginPage;