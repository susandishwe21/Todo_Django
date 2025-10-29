import { useState, useEffect } from 'react'; 
import type { FormEvent } from 'react'; 
import.meta.env.VITE_API_BASE_URL

// Define the structure for a single To-Do item
interface Todo {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  created_at: string;
}

// Access the base API URL from the environment variables (using Vite standard)
// NOTE: If using Create React App (CRA), change this to process.env.REACT_APP_API_BASE_URL
const API_URL = import.meta.env.VITE_API_BASE_URL;

// -----------------------------------------------------------------------------
// Helper Function: Handles API calls and parses the custom JSON wrapper
// -----------------------------------------------------------------------------
const makeApiCall = async (
  endpoint: string = '',
  method: string = 'GET',
  data?: object,
) => {
  // Ensure the URL is correctly constructed
  const url = `${API_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);

    // 1. Handle DELETE (204 No Content)
    if (response.status === 204) {
      return { success: true, message: "Deleted successfully" };
    }

    const responseJson = await response.json();

    // 2. Check for custom 404 error message from Django
    if (response.status === 404 && responseJson.message === "Data not Found") {
        // Return a non-error state for the component to display gracefully
        return { success: false, data: [], metadata: null, message: responseJson.message };
    }
    
    // 3. Check for successful custom message wrapper (200, 201)
    if (response.ok && responseJson.message === 'success') {
      return { success: true, data: responseJson.todo_data, metadata: responseJson, message: responseJson.message };
    } 
    
    // 4. Handle other errors (like 400 Bad Request from validation)
    throw new Error(responseJson.message || "An unknown error occurred");

  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};


// -----------------------------------------------------------------------------
// The Main App Component
// -----------------------------------------------------------------------------

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  // --- R: Read (Fetch Todos) ---
  const fetchTodos = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      // Use the page number in the query parameter to get 5, then 5, etc.
      const result = await makeApiCall(`?page=${page}`); 
      
      setTodos(result.data || []);
      
      // Update pagination metadata from the response
      // We rely on the 'next' and 'previous' URLs being null or present
      setHasNext(!!result.metadata?.next);
      setHasPrevious(!!result.metadata?.previous);
      setCurrentPage(page);

    } catch (err: any) {
      // Catch errors not handled by makeApiCall (e.g., network error)
      setError(`Failed to fetch tasks: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch initial data on component mount
  useEffect(() => {
    if (!API_URL) {
      setError("Configuration Error: VITE_API_BASE_URL is not set.");
      setLoading(false);
      return;
    }
    fetchTodos(1); // Fetch the first page on load
  }, []); // Empty dependency array means this runs only once after the initial render

  // --- C: Create ---
  const addTodo = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const result = await makeApiCall('', 'POST', { 
        title: newTitle.trim(), 
        completed: false 
      });

      // Add the new task to the local state (at the beginning of the list)
      const newTodo = result.data[0];
      setTodos(prevTodos => [newTodo, ...prevTodos]);
      setNewTitle(''); 
    } catch (err: any) {
      alert(`Error creating task: ${err.message}`);
    }
  };

  // --- U: Update (Toggle Completion) ---
  const toggleComplete = async (todo: Todo) => {
    const updatedStatus = !todo.completed;
    
    try {
      const result = await makeApiCall(`${todo.id}/`, 'PATCH', { 
        completed: updatedStatus 
      });

      const updatedTodo = result.data[0];
      
      // Update the local state
      setTodos(prevTodos => 
        prevTodos.map(t => (t.id === todo.id ? updatedTodo : t))
      );
    } catch (err: any) {
      alert(`Error updating task: ${err.message}`);
    }
  };

  // --- D: Delete ---
  const deleteTodo = async (id: number) => {
    try {
      await makeApiCall(`${id}/`, 'DELETE');
      
      // Filter the deleted item out of the local state array
      setTodos(prevTodos => prevTodos.filter(t => t.id !== id));
    } catch (err: any) {
      alert(`Error deleting task: ${err.message}`);
    }
  };
  
  // -----------------------------------------------------------------------------
  // Pagination Handlers
  // -----------------------------------------------------------------------------
  const goToNextPage = () => {
      fetchTodos(currentPage + 1);
  };
  const goToPreviousPage = () => {
      fetchTodos(currentPage - 1);
  };
  
  // -----------------------------------------------------------------------------
  // Rendering the UI
  // -----------------------------------------------------------------------------

  if (loading) return <div style={{ padding: '20px', fontSize: '1.2em' }}>Loading tasks...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto', fontFamily: 'Arial, sans-serif' }}>
      <h1>✅ Welcome React !!!</h1>
      <p style={{marginBottom: '20px', color: '#666'}}>API Status: **Connected**</p>

      {/* Input Form (Create) */}
      <form onSubmit={addTodo} style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a new task..."
          required
          style={{ flexGrow: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <button type="submit" style={{ padding: '10px 15px', backgroundColor: '#0070f3', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
          Add Task
        </button>
      </form>

      {/* To-Do List (Read) */}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {todos.length === 0 && currentPage === 1 ? (
          <p>No tasks yet! Add one above.</p>
        ) : (
          todos.map((todo) => (
            <li
              key={todo.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px',
                marginBottom: '5px',
                border: '1px solid #eee',
                backgroundColor: todo.completed ? '#f0fff0' : 'white',
                borderRadius: '4px',
              }}
            >
              <span
                style={{
                  textDecoration: todo.completed ? 'line-through' : 'none',
                  flexGrow: 1,
                  marginRight: '15px',
                  fontSize: '1.1em',
                  color: todo.completed ? '#888' : '#000',
                }}
              >
                {todo.title}
              </span>
              
              <div style={{display: 'flex', gap: '8px'}}>
                <button 
                  onClick={() => toggleComplete(todo)}
                  style={{ 
                    padding: '6px 10px', 
                    backgroundColor: todo.completed ? '#f39c12' : '#2ecc71', 
                    color: 'white', 
                    border: 'none', 
                    cursor: 'pointer',
                    borderRadius: '4px'
                  }}
                >
                  {todo.completed ? 'Undo' : 'Complete'}
                </button>
                <button 
                  onClick={() => deleteTodo(todo.id)}
                  style={{ 
                    padding: '6px 10px', 
                    backgroundColor: '#e74c3c', 
                    color: 'white', 
                    border: 'none', 
                    cursor: 'pointer',
                    borderRadius: '4px' 
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      {/* Pagination Controls */}
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '15px' }}>
        <button
          onClick={goToPreviousPage}
          disabled={!hasPrevious}
          style={{ padding: '8px 15px', backgroundColor: hasPrevious ? '#3498db' : '#bdc3c7', color: 'white', border: 'none', cursor: hasPrevious ? 'pointer' : 'default', borderRadius: '4px' }}
        >
          Previous Page
        </button>
        <span style={{ padding: '8px 15px' }}>Page {currentPage}</span>
        <button
          onClick={goToNextPage}
          disabled={!hasNext}
          style={{ padding: '8px 15px', backgroundColor: hasNext ? '#3498db' : '#bdc3c7', color: 'white', border: 'none', cursor: hasNext ? 'pointer' : 'default', borderRadius: '4px' }}
        >
          Next Page
        </button>
      </div>

    </div>
  );
}

export default App;