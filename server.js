const express = require('express');
const { sequelize } = require('./models');

const chatSocket = require('./sockets/chatSocket');
const chatRoutes = require('./routes/chatRoutes');

// 웹 소켓 관련
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());  // CORS 미들웨어 적용
app.use(express.json());

const port = process.env.PORT || 3001;

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

chatSocket(io);

// 데이터베이스 연결 확인
sequelize.authenticate()
    .then(() => {
        console.log('Connection has been established successfully.');
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });

// 라우터 설정
app.use('/api', chatRoutes);

server.listen(port, () => {
    console.log(`Server is running on port ${port}.`);
});