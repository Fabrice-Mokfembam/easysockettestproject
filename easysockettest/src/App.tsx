import { useState, useEffect } from 'react';
import { connect, on, off } from '@mokfembam/easysocket-client';

const WS_URL = 'ws://localhost:8087/websocket';

function App() {
  const [employees, setEmployees] = useState([]);

  useEffect(() => {

    connect(WS_URL);

   
    const handleEmployeeData = (data) => {
      if (data.type === 'employeeDataUpdate') {
        setEmployees(data.content);
        console.log('Received employee data update:', data.content);
      }
    };

 
    on('message', handleEmployeeData);

    return () => {
      off('message', handleEmployeeData);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-50 p-6 font-sans">
      <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Employee Data</h1>
        
        {/* Employee Data Table */}
        {employees.length > 0 ? (
          <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Worker ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">First Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((emp) => (
                  <tr key={emp.WorkerID} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{emp.WorkerID}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{emp.FirstName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{emp.LastName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{emp.Department}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      ${Number(emp.Salary).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-500 text-lg p-4">
            Waiting for employee data...
          </div>
        )}
      </div>
    </div>
  );
}

export default App;