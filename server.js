const express = require('express');
const { sequelize } = require('./models'); // 모델 폴더로부터 sequelize 인스턴스를 가져옴

const app = express();
const port = process.env.PORT || 3000;

// 데이터베이스 연결 확인
sequelize.authenticate()
    .then(() => {
        console.log('Connection has been established successfully.');
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });

app.listen(port, () => {
    console.log(`Server is running on port ${port}.`);
});