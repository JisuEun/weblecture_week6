'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // 먼저 Session 데이터를 삽입합니다.
    const session = await queryInterface.bulkInsert('Sessions', [
      {
        status: 'Complete', // 상태는 '완료됨'으로 가정합니다.
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    const sessions = await queryInterface.sequelize.query(
      `SELECT id FROM \`Sessions\` ORDER BY id DESC LIMIT 1;`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    
    const sessionId = sessions[0].id;

    await queryInterface.bulkInsert('Messages', [
      {
        session_id: sessionId,
        type: 'Counselor',
        content: 'hello',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        session_id: sessionId,
        type: 'Counselee',
        content: 'nice to meet you',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        session_id: sessionId,
        type: 'Counselor',
        content: 'bye',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Messages', null, {});
    await queryInterface.bulkDelete('Sessions', null, {});
  }
};
