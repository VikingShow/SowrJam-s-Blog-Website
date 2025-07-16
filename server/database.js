// server/database.js

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    'my_blog',
    'blog_user',
    'sowrjam', // **重要：请将这里替换为你的真实密码**
    {
        host: 'localhost',
        dialect: 'mysql'
    }
);

// **修改：以正确的顺序加载和定义模型**
const Post = require('./models/post')(sequelize);
const Comment = require('./models/comment')(sequelize);
const Tag = require('./models/tag')(sequelize);

// 定义模型间的关系
Post.hasMany(Comment, { onDelete: 'CASCADE', foreignKey: 'PostId' });
Comment.belongsTo(Post, { foreignKey: 'PostId' });

Comment.hasMany(Comment, { as: 'replies', foreignKey: 'parentCommentId' });
Comment.belongsTo(Comment, { as: 'parentComment', foreignKey: 'parentCommentId' });

Post.belongsToMany(Tag, { through: 'PostTags' });
Tag.belongsToMany(Post, { through: 'PostTags' });


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

// 导出所有模型和sequelize实例
module.exports = { sequelize, Post, Comment, Tag };
