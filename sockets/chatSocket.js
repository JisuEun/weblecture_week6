const schedule = require('node-schedule');
const {Session, Message, sequelize} = require('../models');

module.exports = function (io) {
    let counselorSocket = null;
    let counseleeSocket = null;
    let currentSession = null;

    let sessionCounseleeCount = 0;
    let totalCounseleeCount = 0;
    let todayCounseleeCount = 0;

    schedule.scheduleJob('0 0 * * *', () => {
        todayCounseleeCount = 0;
    });

    io.on('connection', (socket) => {
        socket.on('register', async (type) => {
            if (type === 'Counselor') {
                counselorSocket = socket;
                sessionCounseleeCount = 0;
                counselorSocket.emit('counselee stats', {
                    session: sessionCounseleeCount,
                    total: totalCounseleeCount,
                    today: todayCounseleeCount
                });
                console.log('Counselor connected');
            } else if (type === 'Counselee') {
                if (counseleeSocket) {
                    if (currentSession) {
                        await currentSession.update({ status: 'Complete' });
                    }
                    currentSession = await Session.create({ status: 'In Process' });
                    if (!currentSession) {
                        console.error('Failed to create a new session');
                        return;
                    }
                    counseleeSocket.emit('message', {
                        text: '기존 상담자와의 연결이 끊어졌습니다.',
                        sender: 'System'
                    });
                    counseleeSocket.emit('chat ended', '기존 상담자와의 연결이 끊어졌습니다.');
                    counseleeSocket.disconnect(true);
                } else {
                    currentSession = await Session.create({ status: 'In Process' });
                }
                counseleeSocket = socket;
                sessionCounseleeCount++;
                totalCounseleeCount++;
                todayCounseleeCount++;
                console.log('New Counselee connected');
                if (counselorSocket) {
                    counselorSocket.emit('counselee stats', {
                        session: sessionCounseleeCount,
                        total: totalCounseleeCount,
                        today: todayCounseleeCount
                    });
                    counselorSocket.emit('message', {
                        text: '새 상담자와 연결되었습니다.',
                        sender: 'System'
                    });
                }
            }
        });

        socket.on('message', async (msg) => {
            if (socket === counseleeSocket && counselorSocket) {
                if (currentSession) {
                    if (msg) {
                        await Message.create({
                            content: msg.text,
                            type: msg.sender,
                            session_id: currentSession.id
                        });
                    }
                    counselorSocket.emit('message', msg);
                    console.log('Forwarding message from counselee to counselor:', msg);
                }
            } else if (socket === counselorSocket && counseleeSocket) {
                if (currentSession) {
                    if (msg) {
                        await Message.create({
                            content: msg.text,
                            type: msg.sender,
                            session_id: currentSession.id
                        });
                    }
                    counseleeSocket.emit('message', msg);
                    console.log('Forwarding message from counselor to counselee:', msg);
                }
            }
        });

        socket.on('disconnect', async () => {
            console.log(`${socket.id} disconnected`);
            if (socket === counseleeSocket) {
                if (counselorSocket) {
                    counselorSocket.emit('message', {
                        text: '기존 상담자와의 연결이 끊어졌습니다.',
                        sender: 'System'
                    });
                }
                counseleeSocket = null;
            } else if (socket === counselorSocket) {
                if (counseleeSocket) {
                    counseleeSocket.emit('chat ended', '상담사의 연결이 끊어졌습니다.');
                    counseleeSocket.disconnect(true);
                }
                counselorSocket = null;
            }
            if (currentSession) {
                await currentSession.update({ status: 'Complete' });
                currentSession = null;
            }
        });
    });
};