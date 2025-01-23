import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc, collection, addDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { app } from '../firebase';

interface Class {
  id: string;
  name: string;
  students: number;
}

function TeacherDashboard() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const db = getFirestore(app);
        const authId = localStorage.getItem('authId');
        
        if (!authId) {
          throw new Error('No authentication ID found');
        }

        // Get teacher's data
        const teacherDoc = await getDoc(doc(db, 'users', authId));
        if (!teacherDoc.exists()) {
          throw new Error('Teacher document not found');
        }

        const teacherData = teacherDoc.data();
        setTeacherName(teacherData.name || '');

        const teacherClasses = teacherData.classes || [];

        // Fetch details for each class
        const classPromises = teacherClasses.map(async (classId: string) => {
          const classDoc = await getDoc(doc(db, 'classes', classId));
          if (!classDoc.exists()) {
            return null;
          }
          const classData = classDoc.data();
          return {
            id: classDoc.id,
            name: classData.CourseName,
            students: (classData.students || []).length,
          };
        });

        const resolvedClasses = await Promise.all(classPromises);
        const validClasses = resolvedClasses.filter((cls): cls is Class => cls !== null);
        
        setClasses(validClasses);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('authId');
    localStorage.removeItem('isStudent');
    navigate('/');
  };

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleAddClass = async () => {
    if (!courseName.trim() || !teacherName) return;
    
    setIsSubmitting(true);
    try {
      const db = getFirestore(app);
      const authId = localStorage.getItem('authId');

      if (!authId) {
        throw new Error('No authentication ID found');
      }

      // Create new class document with auto-generated ID
      const classesRef = collection(db, 'classes');
      const newClassRef = await addDoc(classesRef, {
        CourseName: courseName,
        Teacher: teacherName, // Store teacher's name instead of authID
        students: [],
      });

      // Add class ID to teacher's classes array
      const teacherRef = doc(db, 'users', authId);
      await updateDoc(teacherRef, {
        classes: arrayUnion(newClassRef.id)
      });

      // Add new class to local state
      setClasses(prev => [...prev, {
        id: newClassRef.id,
        name: courseName,
        students: 0
      }]);

      // Reset form and close modal
      setCourseName('');
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error adding class:', err);
      setError('Failed to add class');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading classes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toolbar */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-800">Teacher Dashboard</h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Class
              </button>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">{cls.name}</h2>
                <div className="flex items-center space-x-2 mb-4">
                  <p className="text-xs text-gray-500 font-mono">{cls.id}</p>
                  <button
                    onClick={() => handleCopyId(cls.id)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Copy class ID"
                  >
                    {copiedId === cls.id ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-gray-600">{cls.students} Students</p>
              </div>
              <div className="px-6 py-4 border-t border-gray-200">
                <button 
                  onClick={() => navigate(`/class/${cls.id}`)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View Class
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Class Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">Create New Class</h2>
            <div className="mb-4">
              <label htmlFor="courseName" className="block text-sm font-medium text-gray-700 mb-1">
                Course Name
              </label>
              <input
                type="text"
                id="courseName"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter course name"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setCourseName('');
                  setIsModalOpen(false);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleAddClass}
                disabled={isSubmitting || !courseName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Class'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeacherDashboard;