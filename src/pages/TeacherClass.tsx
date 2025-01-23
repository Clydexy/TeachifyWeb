import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getFirestore, doc, getDoc, collection, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { app } from '../firebase';

interface Student {
  id: string;
  name: string;
  summary?: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  completed: string[];
  Components?: string[];
  summaries?: { [key: string]: string };
}

function TeacherClass() {
  const navigate = useNavigate();
  const { classId } = useParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [syllabus, setSyllabus] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [className, setClassName] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentSummary, setStudentSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const db = getFirestore(app);
        
        if (!classId) {
          throw new Error('No class ID provided');
        }

        // Get class data
        const classDoc = await getDoc(doc(db, 'classes', classId));
        if (!classDoc.exists()) {
          throw new Error('Class not found');
        }
        
        setClassName(classDoc.data().CourseName || 'Untitled Class');

        // Get student data
        const studentIds = classDoc.data().students || [];
        const studentPromises = studentIds.map(async (studentId: string) => {
          try {
            const studentDoc = await getDoc(doc(db, 'users', studentId));
            if (!studentDoc.exists()) return null;
            return {
              id: studentDoc.id,
              name: studentDoc.data().name || 'Unknown Student'
            };
          } catch (err) {
            console.error(`Error fetching student ${studentId}:`, err);
            return null;
          }
        });

        const resolvedStudents = await Promise.all(studentPromises);
        const validStudents = resolvedStudents.filter((student): student is Student => student !== null);
        setStudents(validStudents);

        // Get assignments
        try {
          const assignmentsRef = collection(doc(db, 'classes', classId), 'assignments');
          const assignmentsSnapshot = await getDocs(assignmentsRef);
          const assignmentsList = assignmentsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              title: data.Title || 'Untitled Assignment',
              description: data.Description || '',
              dueDate: data['Due Date']?.toDate() || new Date(),
              completed: data.completed || [],
              Components: data.Components || [],
              summaries: data.summaries || {}
            };
          });

          setAssignments(assignmentsList);
        } catch (err) {
          console.error('Error fetching assignments:', err);
          throw new Error('Failed to load assignments');
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load class data');
        setLoading(false);
      }
    };

    fetchData();
  }, [classId]);

  const handleViewCompletion = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setIsCompletionModalOpen(true);
    setSelectedStudent(null);
    setStudentSummary(null);
  };

  const handleStudentClick = async (student: Student, assignment: Assignment) => {
    setSelectedStudent(student);
    setStudentSummary(null);
    setLoadingSummary(true);

    try {
      const db = getFirestore(app);
      const chatHistoryId = `${student.id}${assignment.id}`;
      const chatHistoryDoc = await getDoc(doc(db, 'chat-history', chatHistoryId));

      if (chatHistoryDoc.exists() && chatHistoryDoc.data().messages?.length > 0) {
        const response = await fetch('http://localhost:8000/summariseclass', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            learning_objectives: assignment.Components,
            chat_histories: [{
              ...chatHistoryDoc.data(),
              studentId: student.id
            }]
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch summary');
        }

        const data = await response.json();
        setStudentSummary(data.summary);
      } else {
        setStudentSummary("No chat history available for this student.");
      }
    } catch (err) {
      console.error('Error fetching student summary:', err);
      setStudentSummary("Failed to generate student summary. Please try again later.");
    } finally {
      setLoadingSummary(false);
    }

    navigate('/chat', { 
      state: { 
        classId,
        assignmentId: assignment.id,
        studentId: student.id,
        readOnly: true,
        assignmentTitle: assignment.title
      }
    });
  };

  const getCompletedStudents = (assignment: Assignment): Student[] => {
    return students
      .filter(student => assignment.completed.includes(student.id))
      .map(student => ({
        ...student,
        summary: assignment.summaries?.[student.id]
      }));
  };

  const getIncompleteStudents = (assignment: Assignment) => {
    return students.filter(student => !assignment.completed.includes(student.id));
  };

  const handleCreateAssignment = async () => {
    if (!syllabus.trim() || !dueDate) return;
    
    setIsSubmitting(true);
    try {
      const db = getFirestore(app);
      
      // Send syllabus to server
      const response = await fetch('http://localhost:8000/createassignment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          syllabus
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create assignment');
      }

      const data = await response.json();
      
      // Create new assignment in Firestore
      if (!classId) {
        throw new Error('No class ID available');
      }

      const assignmentsRef = collection(doc(db, 'classes', classId), 'assignments');
      const newAssignmentRef = await addDoc(assignmentsRef, {
        Title: data.title || 'Untitled Assignment',
        Description: data.description || '',
        Components: data.learning_objectives || [],
        'Due Date': Timestamp.fromDate(new Date(dueDate)),
        completed: [],
        summaries: {}
      });

      // Add new assignment to local state
      setAssignments(prev => [...prev, {
        id: newAssignmentRef.id,
        title: data.title || 'Untitled Assignment',
        description: data.description || '',
        dueDate: new Date(dueDate),
        completed: [],
        Components: data.learning_objectives || [],
        summaries: {}
      }]);

      // Close modal and reset form
      setSyllabus('');
      setDueDate('');
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error creating assignment:', err);
      setError(err instanceof Error ? err.message : 'Failed to create assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading class data...</div>
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

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toolbar */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-800">{className}</h1>
            <button
              onClick={() => navigate('/teacher')}
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
        {/* Students Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Students</h2>
          {students.length === 0 ? (
            <p className="text-gray-500">No students enrolled yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map((student) => (
                <div key={student.id} className="p-4 border rounded-md">
                  <p className="text-gray-800">{student.name}</p>
                  <p className="text-xs text-gray-500 font-mono mt-1">{student.id}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assignments Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Assignments</h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Assignment
            </button>
          </div>
          {assignments.length === 0 ? (
            <p className="text-gray-500">No assignments created yet</p>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="p-4 border rounded-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-800">{assignment.title}</h3>
                      <p className="text-gray-600 mt-1">{assignment.description}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Due: {assignment.dueDate.toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleViewCompletion(assignment)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <span className="mr-2">{assignment.completed.length}</span>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assignment Completion Modal */}
      {isCompletionModalOpen && selectedAssignment && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{selectedAssignment.title}</h2>
                <p className="text-gray-600 mt-1">Due: {selectedAssignment.dueDate.toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedAssignment(null);
                  setIsCompletionModalOpen(false);
                  setSelectedStudent(null);
                  setStudentSummary(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <div className="grid grid-cols-2 gap-8 h-full">
                {/* Completed Students */}
                <div className="bg-gray-50 rounded-lg p-6 overflow-y-auto">
                  <div className="flex items-center mb-4">
                    <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Completed ({getCompletedStudents(selectedAssignment).length})
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {getCompletedStudents(selectedAssignment).length > 0 ? (
                      getCompletedStudents(selectedAssignment).map((student) => (
                        <div 
                          key={student.id} 
                          className={`bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 ${
                            selectedStudent?.id === student.id ? 'ring-2 ring-blue-500' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-800">{student.name}</p>
                              <p className="text-xs text-gray-500 font-mono mt-1">{student.id}</p>
                              {selectedStudent?.id === student.id && loadingSummary && (
                                <div className="mt-2 flex items-center text-gray-600">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                  Generating summary...
                                </div>
                              )}
                              {selectedStudent?.id === student.id && studentSummary && (
                                <p className="text-sm text-gray-600 mt-2">{studentSummary}</p>
                              )}
                            </div>
                            <button
                              onClick={() => handleStudentClick(student, selectedAssignment)}
                              className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
                              title="View chat history"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 italic">No students have completed this assignment yet.</p>
                    )}
                  </div>
                </div>

                {/* Incomplete Students */}
                <div className="bg-gray-50 rounded-lg p-6 overflow-y-auto">
                  <div className="flex items-center mb-4">
                    <div className="h-2 w-2 bg-red-500 rounded-full mr-2"></div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Incomplete ({getIncompleteStudents(selectedAssignment).length})
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {getIncompleteStudents(selectedAssignment).map((student) => (
                      <div 
                        key={student.id} 
                        className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
                        onClick={() => handleStudentClick(student, selectedAssignment)}
                      >
                        <p className="font-medium text-gray-800">{student.name}</p>
                        <p className="text-xs text-gray-500 font-mono mt-1">{student.id}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Assignment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">Create New Assignment</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="syllabus" className="block text-sm font-medium text-gray-700 mb-1">
                  Syllabus Statements
                </label>
                <textarea
                  id="syllabus"
                  value={syllabus}
                  onChange={(e) => setSyllabus(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter syllabus statements"
                />
              </div>
              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  id="dueDate"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={today}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setSyllabus('');
                  setDueDate('');
                  setIsModalOpen(false);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAssignment}
                disabled={isSubmitting || !syllabus.trim() || !dueDate}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeacherClass;