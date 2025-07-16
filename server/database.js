// server/database.js

const { Sequelize } = require('sequelize');

// 创建一个 Sequelize 实例来连接数据库
const sequelize = new Sequelize(
    'my_blog',   // 数据库名
    'blog_user',     // 用户名
    'sowrjam', // **重要：请将这里替换为你在第2步中设置的真实密码**
    {
        host: 'localhost',
        dialect: 'mysql' // 我们使用 'mysql' 方言来连接 MariaDB
    }
);

// 测试连接
async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('✅ MariaDB connection has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

testConnection();

module.exports = sequelize;
