'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Messages', 'type', {
      type: Sequelize.STRING,
      allowNull: true // 필드를 필수가 아닌 선택 사항으로 설정
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Messages', 'type');
  }
};
