import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

function LandingPage() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const fullText = 'Learning Experience.';

  useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 100); // Adjust speed here

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Navbar */}
      <nav className="backdrop-blur-md bg-black/30 fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 text-transparent bg-clip-text">
                Teachify.
              </span>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2 rounded-full bg-blue-600 text-white font-medium hover:ring-2 hover:ring-white hover:bg-blue-700 focus:outline-none transition-all duration-200"
            >
              Login
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Transform Your{' '}
              <span className="bg-gradient-to-r from-pink-400 to-purple-500 text-transparent bg-clip-text">
                {text}
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Empower your classroom with AI-driven learning tools and real-time student progress tracking.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-3 rounded-full bg-purple-600 text-white font-medium hover:ring-2 hover:ring-white hover:bg-purple-700 focus:outline-none transition-all duration-200"
            >
              Get Started
            </button>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="backdrop-blur-lg bg-white/5 p-6 rounded-2xl border border-white/10 hover:border-pink-500/50 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-500 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">AI-Powered Learning</h3>
              <p className="text-gray-400">Personalized learning experiences tailored to each student's needs.</p>
            </div>

            <div className="backdrop-blur-lg bg-white/5 p-6 rounded-2xl border border-white/10 hover:border-pink-500/50 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-500 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Real-time Progress</h3>
              <p className="text-gray-400">Track student performance and engagement with detailed analytics.</p>
            </div>

            <div className="backdrop-blur-lg bg-white/5 p-6 rounded-2xl border border-white/10 hover:border-pink-500/50 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-500 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Collaborative Learning</h3>
              <p className="text-gray-400">Foster engagement and interaction between students and teachers.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;