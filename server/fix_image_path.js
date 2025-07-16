// server/fix_image_paths.js
// 这是一个一次性运行的脚本，用于修复数据库中文章内容的图片路径

const sequelize = require('./database');
const Post = require('./models/post');
const { Op } = require('sequelize');

// --- 配置 ---
// 你旧的WordPress上传目录的基础URL
const OLD_BASE_URL = 'http://www.sowrjam.cn:9000/wp-content/uploads';
// 你希望替换成的新路径 (相对于网站根目录)
const NEW_BASE_PATH = '/uploads';
// ---

async function fixImagePaths() {
    console.log('>>> 开始修复图片路径...');
    try {
        // 1. 找到所有内容中包含旧URL的文章
        const postsToFix = await Post.findAll({
            where: {
                content: {
                    [Op.like]: `%${OLD_BASE_URL}%`
                }
            }
        });

        if (postsToFix.length === 0) {
            console.log('✅ 没有找到需要修复图片路径的文章。');
            return;
        }

        console.log(`>>> 发现 ${postsToFix.length} 篇文章需要修复...`);
        let updatedCount = 0;

        // 2. 遍历每一篇文章，替换路径并保存
        for (const post of postsToFix) {
            const oldContent = post.content;
            // 使用正则表达式进行全局替换
            const newContent = oldContent.replace(new RegExp(OLD_BASE_URL, 'g'), NEW_BASE_PATH);
            
            if (oldContent !== newContent) {
                post.content = newContent;
                await post.save();
                updatedCount++;
                console.log(`   - 已更新文章: "${post.title}"`);
            }
        }

        console.log(`✅ 成功更新了 ${updatedCount} 篇文章的图片路径！`);

    } catch (error) {
        console.error('修复图片路径时发生错误:', error);
    } finally {
        await sequelize.close();
        console.log('--- 脚本执行完毕 ---');
    }
}

fixImagePaths();
