import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getFirestore, collection, getDocs, doc } from 'firebase/firestore';
import { app } from '../firebase';

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  completed: boolean;
}

function AssignmentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const db = getFirestore(app);
        const classId = location.state?.classId;
        const authId = localStorage.getItem('authId');

        if (!classId) {
          throw new Error('No class ID provided');
        }

        if (!authId) {
          throw new Error('No auth ID found');
        }

        const assignmentsRef = collection(doc(db, 'classes', classId), 'assignments');
        const assignmentsSnapshot = await getDocs(assignmentsRef);
        
        const assignmentsList = assignmentsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.Title,
            description: data.Description,
            dueDate: data['Due Date'].toDate(),
            completed: (data.completed || []).includes(authId)
          };
        });

        // Sort assignments:
        // 1. Uncompleted first, then completed
        // 2. Within each group, sort by due date (closest first)
        const sortedAssignments = assignmentsList.sort((a, b) => {
          // First sort by completion status
          if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
          }
          // Then sort by due date
          return a.dueDate.getTime() - b.dueDate.getTime();
        });

        setAssignments(sortedAssignments);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching assignments:', err);
        setError('Failed to load assignments');
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [location.state]);

  const handleAssignmentClick = (assignmentId: string) => {
    navigate('/chat', { 
      state: { 
        classId: location.state.classId,
        assignmentId: assignmentId 
      }
    });
  };

  const isOverdue = (dueDate: Date, completed: boolean) => {
    return !completed && dueDate < new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading assignments...</div>
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
            <h1 className="text-xl font-bold text-gray-800">Assignments</h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-lg shadow-sm">
            <svg
              className="w-16 h-16 text-gray-500 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-2xl font-semibold text-gray-700">Woohoo, you have no assignments yet!</h2>
            <p className="text-gray-500 mt-2">Time to relax and enjoy your free time!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                onClick={() => handleAssignmentClick(assignment.id)}
                className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer ${
                  isOverdue(assignment.dueDate, assignment.completed) ? 'border-2 border-red-400' : ''
                }`}
              >
                <div className="p-6 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h2 className={`text-lg font-semibold ${
                        isOverdue(assignment.dueDate, assignment.completed) ? 'text-red-600' : 'text-gray-800'
                      }`}>
                        {assignment.title}
                      </h2>
                      {assignment.completed && (
                        <svg
                          className="h-5 w-5 text-green-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      )}
                    </div>
                    <p className={`${
                      isOverdue(assignment.dueDate, assignment.completed) ? 'text-red-600' : 'text-gray-600'
                    } mt-1`}>
                      {assignment.description}
                    </p>
                    <p className={`text-sm mt-2 ${
                      isOverdue(assignment.dueDate, assignment.completed) 
                        ? 'text-red-700 font-semibold' 
                        : 'text-gray-500'
                    }`}>
                      Due: {assignment.dueDate.toLocaleDateString()}
                      {isOverdue(assignment.dueDate, assignment.completed) && ' (Overdue)'}
                    </p>
                  </div>
                  <svg
                    className={`h-6 w-6 ${
                      isOverdue(assignment.dueDate, assignment.completed) ? 'text-red-600' : 'text-blue-600'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AssignmentsPage;