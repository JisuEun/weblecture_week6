const express = require('express');
const { sequelize } = require('./models');

const chatSocket = require('./sockets/chatSocket');
const chatRoutes = require('./routes/chatRoutes');

const path = require('path');

// 웹 소켓 관련
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors({
    origin: 'http://localhost:3000',  // 3000번 포트만 허용
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // 허용할 HTTP 메소드
    allowedHeaders: ['Content-Type', 'Authorization'], // 허용할 헤더
}));

app.use(express.json());

const port = process.env.PORT || 3001;

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: 'http://localhost:3000',  // 3000번 포트만 허용
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    }
});

chatSocket(io);

// 라우터 설정
app.use('/api', chatRoutes);

// React 빌드 폴더를 정적 파일로 제공
app.use(express.static(path.join(__dirname, 'client', 'build')));

// 모든 경로에 대해 React 애플리케이션을 반환하도록 설정
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

// 데이터베이스 연결 확인
sequelize.authenticate()
    .then(() => {
        console.log('Connection has been established successfully.');
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });



server.listen(port, () => {
    console.log(`Server is running on port ${port}.`);
});