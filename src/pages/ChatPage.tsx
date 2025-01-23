import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { app } from '../firebase';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface Message {
  id: number;
  text: string;
  sender: 'bot' | 'user';
  timestamp: Date;
}

interface LearningObjective {
  id: number;
  text: string;
  completed: boolean;
}

function MessageContent({ text, sender }: { text: string; sender: 'bot' | 'user' }) {
  if (sender === 'user') {
    return <p>{text}</p>;
  }

  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => <span className="text-inherit">{children}</span>,
          a: ({ children, href }) => (
            <a href={href} className="text-blue-400 hover:text-blue-300" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function ChatPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [learningObjectives, setLearningObjectives] = useState<LearningObjective[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [studentName, setStudentName] = useState('');
  const [summaryGenerated, setSummaryGenerated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isReadOnly = location.state?.readOnly || false;
  const studentId = location.state?.studentId;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateAndStoreSummary = async (objectives: LearningObjective[]) => {
    try {
      const db = getFirestore(app);
      const authId = studentId || localStorage.getItem('authId');
      const { assignmentId, classId } = location.state;
      const chatHistoryId = `${authId}${assignmentId}`;

      // Request summary from the server
      const response = await fetch('http://localhost:8000/summarisestudent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatHistoryId,
          learningObjectives: objectives.map(obj => obj.text)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();

      // Store the summary in Firestore
      const assignmentRef = doc(db, 'classes', classId, 'assignments', assignmentId);
      await updateDoc(assignmentRef, {
        [`summaries.${authId}`]: data.summary
      });

    } catch (err) {
      console.error('Error generating/storing summary:', err);
    }
  };

  const saveCompletedObjectives = async (objectives: LearningObjective[]) => {
    try {
      const db = getFirestore(app);
      const authId = studentId || localStorage.getItem('authId');
      const { assignmentId } = location.state;
      const chatHistoryRef = doc(db, 'chat-history', `${authId}${assignmentId}`);

      await updateDoc(chatHistoryRef, {
        completedObjectives: objectives.map((obj, index) => ({
          index,
          completed: obj.completed
        }))
      });

      // Check if all objectives are completed and summary hasn't been generated yet
      const allCompleted = objectives.every(obj => obj.completed);
      if (allCompleted && !summaryGenerated) {
        await generateAndStoreSummary(objectives);
        setSummaryGenerated(true);
      }
    } catch (err) {
      console.error('Error saving completed objectives:', err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const db = getFirestore(app);
        const { classId, assignmentId } = location.state;
        const authId = studentId || localStorage.getItem('authId');

        if (!classId || !assignmentId || !authId) {
          throw new Error('Missing required IDs');
        }

        // Fetch student name if in read-only mode
        if (isReadOnly && studentId) {
          const studentDoc = await getDoc(doc(db, 'users', studentId));
          if (studentDoc.exists()) {
            setStudentName(studentDoc.data().name || 'Unknown Student');
          }
        }

        // Fetch assignment title
        const assignmentRef = doc(db, 'classes', classId, 'assignments', assignmentId);
        const assignmentDoc = await getDoc(assignmentRef);
        
        if (!assignmentDoc.exists()) {
          throw new Error('Assignment not found');
        }
        
        setAssignmentTitle(assignmentDoc.data().Title || '');

        // Fetch chat history and completed objectives
        const chatHistoryRef = doc(db, 'chat-history', `${authId}${assignmentId}`);
        const chatHistoryDoc = await getDoc(chatHistoryRef);

        let completedObjectives: { index: number; completed: boolean }[] = [];
        
        if (chatHistoryDoc.exists()) {
          const chatData = chatHistoryDoc.data();
          const convertedMessages = chatData.messages.map((msg: any, index: number) => ({
            id: index + 1,
            text: msg.data.content,
            sender: msg.type === 'human' ? 'user' : 'bot',
            timestamp: new Date()
          }));
          setMessages(convertedMessages);
          
          completedObjectives = chatData.completedObjectives || [];
        } else if (!isReadOnly) {
          setMessages([{
            id: 1,
            text: "Hello! I'm your AI learning assistant. I will ask you questions to test whether you can meet the learning objectives set by your teacher. Say Hi to begin.",
            sender: 'bot',
            timestamp: new Date(),
          }]);
        }

        // Fetch learning objectives
        const components = assignmentDoc.data().Components || [];
        const objectives = components.map((component: string, index: number) => ({
          id: index + 1,
          text: component,
          completed: completedObjectives.find(obj => obj.index === index)?.completed || false
        }));

        setLearningObjectives(objectives);

        // Check if all objectives are completed and update assignment if needed
        const allCompleted = completedObjectives.length === components.length && 
                           completedObjectives.every(obj => obj.completed);
        
        if (allCompleted && !isReadOnly) {
          // Update assignment's completed array if not already marked
          const completed = assignmentDoc.data().completed || [];
          if (!completed.includes(authId)) {
            await updateDoc(assignmentRef, {
              completed: arrayUnion(authId)
            });
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load chat data');
        setLoading(false);
      }
    };

    fetchData();
  }, [location.state, isReadOnly, studentId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      text: inputMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const authId = localStorage.getItem('authId');
      const { assignmentId } = location.state;
      
      const response = await fetch('http://localhost:8000/talkstream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          components: learningObjectives.map(obj => obj.text),
          authId,
          assignmentId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from server');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      let botResponse = '';
      let completedCriteria: number[] = [];

      // IMPORTANT: Completion criteria handling
      // 1. We collect ALL completion tokens during the stream
      // 2. We prevent duplicates using !completedCriteria.includes(index)
      // 3. We update the UI with the bot's response immediately for better UX
      // 4. We apply ALL completion updates at once AFTER the stream is done
      // This ensures we don't miss any completions and don't have race conditions
      // from updating the state while still receiving stream data
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('__COMPLETED_CRITERION__')) {
            const index = parseInt(line.replace('__COMPLETED_CRITERION__', ''), 10);
            // Add to array only if not already included
            if (!completedCriteria.includes(index)) {
              completedCriteria.push(index);
            }
          } else if (line.trim()) {
            botResponse += line;
          }
        }

        // Update message immediately for responsive UI
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage.sender === 'bot') {
            return [...prev.slice(0, -1), {
              ...lastMessage,
              text: botResponse
            }];
          } else {
            return [...prev, {
              id: prev.length + 1,
              text: botResponse,
              sender: 'bot',
              timestamp: new Date()
            }];
          }
        });
      }

      // After the stream is complete, update all completed objectives at once
      if (completedCriteria.length > 0) {
        setLearningObjectives(prev => {
          // Create a new array with all updates applied at once
          const updated = prev.map((obj, index) => ({
            ...obj,
            completed: completedCriteria.includes(index) ? true : obj.completed
          }));
          
          // Save to Firestore after all updates are applied
          saveCompletedObjectives(updated);
          return updated;
        });
      }

      setIsTyping(false);
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        text: "I'm sorry, I'm having trouble connecting right now. Please try again later.",
        sender: 'bot',
        timestamp: new Date()
      }]);
      setIsTyping(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading chat data...</div>
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
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Fixed top navbar - always visible */}
      <div className="bg-white shadow fixed top-0 left-0 right-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-800">
                {isReadOnly ? `${studentName}'s Chat - ${assignmentTitle}` : assignmentTitle}
              </h1>
              {isReadOnly && (
                <span className="ml-4 px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded">
                  Read-only view
                </span>
              )}
            </div>
            <button
              onClick={() => navigate(isReadOnly ? `/class/${location.state.classId}` : '/dashboard')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to {isReadOnly ? 'Class' : 'Dashboard'}
            </button>
          </div>
        </div>
      </div>

      {/* Main content area - adjusted to account for fixed navbar and sidebar */}
      <div className="flex-1 flex pt-16"> {/* pt-16 accounts for navbar height */}
        {/* Chat area - takes remaining width after subtracting sidebar width */}
        <div className="flex-1 flex flex-col mr-80"> {/* mr-80 prevents overlap with sidebar */}
          {/* Scrollable messages container with padding bottom for input box */}
          <div className="flex-1 overflow-y-auto p-6 pb-24"> {/* pb-24 prevents messages from being hidden behind input */}
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-sm rounded-lg px-4 py-2 ${
                      message.sender === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-800 shadow-sm'
                    }`}
                  >
                    <MessageContent text={message.text} sender={message.sender} />
                    <p className="text-xs mt-1 opacity-75">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-800 shadow-sm rounded-lg px-4 py-2">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Fixed input box at bottom of chat area */}
          {!isReadOnly && (
            <div className="border-t bg-white p-4 fixed bottom-0 left-0 right-80"> {/* right-80 aligns with sidebar */}
              <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto">
                <div className="flex space-x-4">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isTyping}
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    disabled={isTyping || !inputMessage.trim()}
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Fixed sidebar - always visible */}
        <div className="w-80 bg-white border-l overflow-y-auto fixed right-0 top-16 bottom-0">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Learning Objectives</h2>
            <div className="space-y-3">
              {learningObjectives.map((objective) => (
                <div key={objective.id} className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={objective.completed}
                    readOnly
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`text-gray-700 ${objective.completed ? 'line-through' : ''}`}>
                    {objective.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;