// server/models/tag.js

const { DataTypes } = require('sequelize');

// **修改：将整个文件导出为一个函数，接收 sequelize 作为参数**
module.exports = (sequelize) => {
    const Tag = sequelize.define('Tag', {
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        }
    }, {
        timestamps: false
    });
    return Tag;
};
