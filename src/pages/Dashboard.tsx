import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { app } from '../firebase';

interface Course {
  id: string;
  name: string;
  teacher: string;
}

function Dashboard() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [classCode, setClassCode] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const db = getFirestore(app);
        const authId = localStorage.getItem('authId');
        
        if (!authId) {
          throw new Error('No authentication ID found');
        }

        // Get user's classes
        const userDoc = await getDoc(doc(db, 'users', authId));
        if (!userDoc.exists()) {
          throw new Error('User document not found');
        }

        const userClasses = userDoc.data().classes || [];

        // Fetch details for each class
        const classPromises = userClasses.map(async (classId: string) => {
          const classDoc = await getDoc(doc(db, 'classes', classId));
          if (!classDoc.exists()) {
            return null;
          }
          const classData = classDoc.data();
          return {
            id: classDoc.id,
            name: classData.CourseName,
            teacher: classData.Teacher,
          };
        });

        const resolvedClasses = await Promise.all(classPromises);
        const validClasses = resolvedClasses.filter((course): course is Course => course !== null);
        
        setCourses(validClasses);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError('Failed to load courses');
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('authId');
    localStorage.removeItem('isStudent');
    navigate('/');
  };

  const handleAddClass = async () => {
    setJoinError(null);
    if (!classCode.trim()) return;

    try {
      const db = getFirestore(app);
      const authId = localStorage.getItem('authId');

      if (!authId) {
        throw new Error('No authentication ID found');
      }

      // Check if class exists
      const classRef = doc(db, 'classes', classCode.trim());
      const classDoc = await getDoc(classRef);

      if (!classDoc.exists()) {
        setJoinError('Class not found');
        return;
      }

      // Add student to class's students array
      await updateDoc(classRef, {
        students: arrayUnion(authId)
      });

      // Add class to student's classes array
      const userRef = doc(db, 'users', authId);
      await updateDoc(userRef, {
        classes: arrayUnion(classCode.trim())
      });

      // Add new class to local state
      const classData = classDoc.data();
      setCourses(prev => [...prev, {
        id: classDoc.id,
        name: classData.CourseName,
        teacher: classData.Teacher,
      }]);

      setClassCode('');
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error joining class:', err);
      setJoinError('Failed to join class');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading courses...</div>
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
            <h1 className="text-xl font-bold text-gray-800">My Classes</h1>
            <div className="flex items-center space-x-4">
              <button
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={() => setIsModalOpen(true)}
              >
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Class
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
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">{course.name}</h2>
                <p className="text-gray-600">{course.teacher}</p>
              </div>
              <div className="px-6 py-4 border-t border-gray-200">
                <button 
                  onClick={() => navigate('/assignments', { state: { classId: course.id } })}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Open Class
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">Join Class</h2>
            {joinError && (
              <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                {joinError}
              </div>
            )}
            <div className="mb-4">
              <label htmlFor="classCode" className="block text-sm font-medium text-gray-700 mb-1">
                Class Code
              </label>
              <input
                type="text"
                id="classCode"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter class code"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setClassCode('');
                  setJoinError(null);
                  setIsModalOpen(false);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleAddClass}
                disabled={!classCode.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Join Class
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;