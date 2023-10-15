const express = require('express');
const http = require('http');
const mysql = require('mysql');
const socketIO = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const useragent = require('useragent');

// Serve static files
app.use(express.static('public'));

// Serve the index.html file
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Create a MySQL connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'stin'
});

// Connect to the MySQL server
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL');
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('A user connected');

    // Get the IP address and device information of the client
    const ip = socket.handshake.address;
    const agent = useragent.parse(socket.handshake.headers['user-agent']);

  // Listen for location updates
  socket.on('locationUpdate', (location) => {
    console.log('Location:', location);

        // Save the location, IP address, and device information to the database
        saveLocation(location, ip, agent);

    // Broadcast the location update to all connected clients
    socket.broadcast.emit('locationUpdate', location);
  });

    // Listen for image captures
    socket.on('imageCapture', (image) => {
      console.log('Image captured');
  
      // Save the image to the server's file system
      const imageName = `image-${Date.now()}.png`;
      const imagePath = `./public/images/${imageName}`;
      const base64Data = image.replace(/^data:image\/png;base64,/, '');
      fs.writeFile(imagePath, base64Data, 'base64', (err) => {
        if (err) {
          console.error('Error saving image:', err);
        } else {
          console.log('Image saved:', imageName);
        }
      });
    });

  // Disconnect event
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// Function to save the location, IP address, and device information to the database
function saveLocation(location, ip, agent) {
  const query = 'INSERT INTO locations (latitude, longitude, ip_address, device_name, device_os, device_family) VALUES (?, ?, ?, ?, ?, ?)';
  const values = [location.latitude, location.longitude, ip, agent.toAgent(), agent.os.toString(), agent.family];
  connection.query(query, values, (err, result) => {
    if (err) {
      console.error('Error saving location:', err);
    } else {
      console.log('Location saved:', result.insertId);
    }
  });
}

// Start the server
const port = 3000;
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
