const schedule = require('node-schedule');
const { Session, Message } = require('../models');

module.exports = function (io) {
    let counselorSocket = null;
    let counseleeSocket = null;
    let currentSession = null;

    let sessionCounseleeCount = 0;
    let totalCounseleeCount = 0;
    let todayCounseleeCount = 0;

    // 매일 자정에 오늘 상담한 상담자 수를 리셋
    schedule.scheduleJob('0 0 * * *', () => {
        todayCounseleeCount = 0;
    });

    io.on('connection', (socket) => {
        console.log('New socket connected:', socket.id);

        socket.on('register', async (type) => {
            console.log(`Socket ${socket.id} registered as ${type}`);
            if (type === 'Counselor') {
                counselorSocket = socket;
                console.log('Counselor socket set:', counselorSocket.id);
                sessionCounseleeCount = 0;
                counselorSocket.emit('counselee stats', {
                    session: sessionCounseleeCount,
                    total: totalCounseleeCount,
                    today: todayCounseleeCount
                });
                console.log('Counselor connected:', socket.id);
            } else if (type === 'Counselee') {
                try {
                    if (counseleeSocket) {
                        console.log('Existing counselee socket found. Completing current session if exists.');
                        if (currentSession) {
                            await currentSession.update({ status: 'Complete' });
                        }
                        counseleeSocket.emit('message', {
                            text: '기존 상담자와의 연결이 끊어졌습니다.',
                            sender: 'System'
                        });
                        counseleeSocket.emit('chat ended', '기존 상담자와의 연결이 끊어졌습니다.');
                        counseleeSocket.disconnect(true);

                        // 새로운 세션 생성을 지연하여 기존 상담자가 완전히 연결 해제된 후 생성하도록 합니다.
                        setTimeout(async () => {
                            console.log('Creating a new session for new counselee');
                            const newSession = await Session.create({ status: 'In Process' });
                            if (!newSession) {
                                console.error('Failed to create a new session');
                                return;
                            }
                            currentSession = newSession;
                            console.log('New session created:', currentSession.id);
                            counseleeSocket = socket;
                            console.log('Counselee socket set:', counseleeSocket.id);
                            sessionCounseleeCount++;
                            totalCounseleeCount++;
                            todayCounseleeCount++;
                            console.log('New Counselee connected:', socket.id);
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
                        }, 1000); // 1초 지연
                    } else {
                        console.log('No existing counselee socket. Creating a new session for first counselee.');
                        const newSession = await Session.create({ status: 'In Process' });
                        if (!newSession) {
                            console.error('Failed to create a new session');
                            return;
                        }
                        currentSession = newSession;
                        console.log('New session created:', currentSession.id);
                        counseleeSocket = socket;
                        console.log('Counselee socket set:', counseleeSocket.id);
                        sessionCounseleeCount++;
                        totalCounseleeCount++;
                        todayCounseleeCount++;
                        console.log('New Counselee connected:', socket.id);
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
                } catch (error) {
                    console.error('Error during counselee registration:', error);
                }
            }
        });

        socket.on('message', async (msg) => {
            console.log(`Message received from socket ${socket.id}:`, msg);
            try {
                console.log('counseleeSocket:', counseleeSocket ? counseleeSocket.id : 'none');
                console.log('counselorSocket:', counselorSocket ? counselorSocket.id : 'none');
                console.log('currentSession:', currentSession ? currentSession.id : 'none');

                if (socket === counseleeSocket && counselorSocket) {
                    console.log('Handling message from counselee');
                    if (currentSession) {
                        console.log('Current session exists:', currentSession.id);
                        if (msg) {
                            await Message.create({
                                content: msg.text,
                                type: msg.sender,
                                session_id: currentSession.id
                            });
                            console.log('Message saved to DB:', msg);
                        }
                        counselorSocket.emit('message', msg);
                        console.log('Forwarding message from counselee to counselor:', msg);
                    } else {
                        console.error('No current session exists');
                    }
                } else if (socket === counselorSocket && counseleeSocket) {
                    console.log('Handling message from counselor');
                    if (currentSession) {
                        console.log('Current session exists:', currentSession.id);
                        if (msg) {
                            await Message.create({
                                content: msg.text,
                                type: msg.sender,
                                session_id: currentSession.id
                            });
                            console.log('Message saved to DB:', msg);
                        }
                        counseleeSocket.emit('message', msg);
                        console.log('Forwarding message from counselor to counselee:', msg);
                    } else {
                        console.error('No current session exists');
                    }
                }
            } catch (error) {
                console.error('Error processing message:', error);
            }
        });

        socket.on('disconnect', async () => {
            console.log(`Socket ${socket.id} disconnected`);
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