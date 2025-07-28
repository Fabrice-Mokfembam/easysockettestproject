import pyodbc
import requests
import time

conn_str = (
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=localhost;"  
    "PORT=1433;"        
    "DATABASE=ITsolution;"
    "UID=sa;"
    "PWD=ABCdef123.;"   
    "Encrypt=yes;"
    "TrustServerCertificate=yes;"
)

print("Starting activator script...")  
while True:
    try:
      print("Attempting to connect to SQL Server...")  
      conn = pyodbc.connect(conn_str)
      print("Connected to SQL Server.")  
      cursor = conn.cursor()
      print("Executing WAITFOR RECEIVE...")  
      cursor.execute("""
          WAITFOR (
              RECEIVE TOP(1)
                  conversation_handle,
                  message_type_name,
                  message_body
              FROM EmployeeChangeQueue
          ), TIMEOUT 5000;
      """)
      row = cursor.fetchone()
      if row and row.message_type_name != 'http://schemas.microsoft.com/SQL/ServiceBroker/EndDialog':
          message_body = row.message_body.decode('utf-8')
          conversation_handle = row.conversation_handle
          print(f"Received message: {message_body}")

          try:
              print("Sending HTTP request to Node.js...")  
              response = requests.post('http://localhost:3000/db-notification', json={'message': message_body})
              print(f"Sent notification to Node.js: {response.status_code}")
          except Exception as e:
              print(f"Error sending HTTP request: {e}")

          cursor.execute("END CONVERSATION ?;", (conversation_handle,))
          conn.commit()
      else:
          print("No new messages in queue.")  
      conn.close()
    except Exception as e:
        print(f"Error: {e}")
    time.sleep(1)