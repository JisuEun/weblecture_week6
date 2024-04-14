const schedule = require('node-schedule');

module.exports = function (io) {
    let counselorSocket = null;
    let counseleeSocket = null;

    let sessionCounseleeCount = 0; // 접속 이후 상담자 수
    let totalCounseleeCount = 0; // 전체 상담자 수
    let todayCounseleeCount = 0; // 오늘 상담한 상담자 수

    // 매일 자정에 오늘 상담한 상담자 수를 리셋
    schedule.scheduleJob('0 0 * * *', () => {
        todayCounseleeCount = 0;
    });
    
    io.on('connection', (socket) => {
        socket.on('register', (type) => {
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
                    counseleeSocket.emit('message', {
                        text: '기존 상담자와의 연결이 끊어졌습니다.',
                        sender: 'System'
                    });
                    counseleeSocket.emit('chat ended', '기존 상담자와의 연결이 끊어졌습니다.'); 
                    counseleeSocket.disconnect(true);
                }
                // 새 Counselee가 연결되면 Counselor에게 시스템 메시지를 보냅니다.
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
    
        socket.on('message', (msg) => {
            if (socket === counseleeSocket) {
                if (counselorSocket) {
                    console.log('Forwarding message from counselee to counselor:', msg);
                    counselorSocket.emit('message', msg);
                } else {
                    console.log('Counselor is not connected');
                }
            } else if (socket === counselorSocket) {
                if (counseleeSocket) {
                    console.log('Forwarding message from counselor to counselee:', msg);
                    counseleeSocket.emit('message', msg);
                } else {
                    console.log('Counselee is not connected');
                }
            }
        });
    
        socket.on('disconnect', () => {
            console.log(`${socket.id} disconnected`);
            // Counselee가 연결을 끊으면 Counselor에게 알림을 보냅니다.
            if (socket === counseleeSocket) {
                if (counselorSocket) {
                    counselorSocket.emit('message', {
                        text: '기존 상담자와의 연결이 끊어졌습니다.',
                        sender: 'System'
                    });
                }
                counseleeSocket = null;
            } else if (socket === counselorSocket) {
                counselorSocket = null;
            }
        });
    });
};