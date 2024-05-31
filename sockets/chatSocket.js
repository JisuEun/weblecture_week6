const schedule = require('node-schedule');
const {Session, Message, sequelize} = require('../models')

module.exports = function (io) {
    let counselorSocket = null;
    let counseleeSocket = null;
    let currentSession = null; // 현재 세션 인스턴스

    let sessionCounseleeCount = 0; // 접속 이후 상담자 수
    let totalCounseleeCount = 0; // 전체 상담자 수
    let todayCounseleeCount = 0; // 오늘 상담한 상담자 수

    // 매일 자정에 오늘 상담한 상담자 수를 리셋
    schedule.scheduleJob('0 0 * * *', () => {
        todayCounseleeCount = 0;
    });

    io.on('connection', (socket) => {
        socket.on('register', async (type) => {
            if (type === 'Counselor') {
                counselorSocket = socket;
                sessionCounseleeCount = 0; // 접속 이후 상담자 수 초기화
                // 상담사 접속 시 모든 카운트 전송
                counselorSocket.emit('counselee stats', {
                    session: sessionCounseleeCount,
                    total: totalCounseleeCount,
                    today: todayCounseleeCount
                });
                console.log('Counselor connected');
            } else if (type === 'Counselee') {
                // 기존 Counselee와의 연결이 끊기면 시스템 메시지를 보냅니다.
                if (counseleeSocket) {
                    // 새 상담자 연결 시 기존 세션 종료 및 새 세션 시작
                    if (currentSession) {
                        await currentSession.update({ status: 'Complete' });
                    } else {
                        console.log('Currently there is no Session');
                    }
                    currentSession = await Session.create({ status: 'In Process' });
                    if (!currentSession) {
                        console.error('Failed to create a new session');
                        return;  // Ensure that we do not proceed without a valid session
                    }
                    if (counseleeSocket) {
                        // Notify the old counselee if they are being disconnected
                        counseleeSocket.emit('message', {
                            text: '기존 상담자와의 연결이 끊어졌습니다.',
                            sender: 'System'
                        });
                        counseleeSocket.emit('chat ended', '기존 상담자와의 연결이 끊어졌습니다.');
                        counseleeSocket.disconnect(true);
                    }
                } else {
                    console.log('Currently there is no Session');
                    currentSession = await Session.create({ status: 'In Process' });
                }
                counseleeSocket = socket;
                sessionCounseleeCount++;  // 새 상담자가 연결될 때마다 카운트 증가
                totalCounseleeCount++;
                todayCounseleeCount++;
                console.log('New Counselee connected');
                if (counselorSocket) {
                    counselorSocket.emit('counselee stats', {
                        session: sessionCounseleeCount,
                        total: totalCounseleeCount,
                        today: todayCounseleeCount
                    });
                }

                if (counselorSocket) {
                    counselorSocket.emit('message', {
                        text: '새 상담자와 연결되었습니다.',
                        sender: 'System'
                    });
                }
            }
        });

        socket.on('message', async (msg) => {
            if (socket === counseleeSocket) {
                if (currentSession) {
                    if (msg) {
                        await Message.create({
                            content: msg.text,
                            type: msg.sender,
                            session_id: currentSession.id
                        });
                    }
                    counselorSocket?.emit('message', msg);
                    console.log('Forwarding message from counselee to counselor:', msg);
                    //counselorSocket.emit('message', msg);
                } else {
                    console.log('Counselor is not connected');
                }
            } else if (socket === counselorSocket) {
                if (currentSession) {
                    if (msg) {
                        await Message.create({
                            content: msg.text,
                            type: msg.sender,
                            session_id: currentSession.id
                        });
                    }
                    counseleeSocket?.emit('message', msg);
                    console.log('Forwarding message from counselor to counselee:', msg);
                } else {
                    console.log('Counselee is not connected');
                }
            }
        });

        socket.on('disconnect', async () => {
            console.log(`${socket.id} disconnected`);
            // Counselee가 연결을 끊으면 Counselor에게 알림 보냄
            // 상담자 연결 해제 시 세션 업데이트
            if (socket === counseleeSocket) {
                if (counselorSocket) {
                    counselorSocket.emit('message', {
                        text: '기존 상담자와의 연결이 끊어졌습니다.',
                        sender: 'System'
                    });
                }
                counseleeSocket = null;
            } else if (socket === counselorSocket) {
                // 상담사의 연결이 끊어지면 사용자에게 알림을 보내고 메인화면으로 돌아가게 함
                if (counseleeSocket) {
                    counseleeSocket.emit('chat ended', '상담사의 연결이 끊어졌습니다.');
                    counseleeSocket.disconnect(true);
                }
                counselorSocket = null;
            }

            // 상담자 연결 해제 시 세션 업데이트
            if (currentSession) {
                await currentSession.update({ status: 'Complete' });
                currentSession = null;
            }
        });
    });
};