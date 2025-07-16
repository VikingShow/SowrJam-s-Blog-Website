// server/migrate.js

const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const TurndownService = require('turndown');
const sequelize = require('./database');
// **修改：从sequelize中引入Op操作符**
const { Op } = require('sequelize');

const Post = require('./models/post');
const Comment = require('./models/comment');

const XML_FILE_PATH = path.join(__dirname, '..', 'sowrhome.WordPress.2025-07-16.xml'); 

async function migrate() {
    const turndownService = new TurndownService();

    try {
        console.log('>>> 正在同步数据库表结构...');
        // force: true 会先删除已存在的表，再重新创建
        await sequelize.sync({ force: true });
        console.log('✅ 数据库表结构同步完成！');

        const xmlData = fs.readFileSync(XML_FILE_PATH, 'utf8');
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(xmlData);
        console.log('   - XML文件解析成功。');

        const items = result.rss.channel[0].item;
        
        const postsToMigrate = items
            .filter(item => item['wp:post_type'][0] === 'post' && item['wp:status'][0] === 'publish')
            .map(wpPost => {
                const tags = (wpPost.category || []).filter(c => c.$.domain === 'category').map(c => c._);
                const markdownContent = turndownService.turndown(wpPost['content:encoded'][0] || '');
                return {
                    title: wpPost.title[0],
                    content: markdownContent,
                    publishDate: new Date(wpPost.pubDate[0]),
                    status: wpPost['wp:status'][0],
                    tags: tags,
                    wpPostId: parseInt(wpPost['wp:post_id'][0])
                };
            });
        
        console.log(`>>> 发现 ${postsToMigrate.length} 篇已发布的文章需要迁移...`);
        await Post.bulkCreate(postsToMigrate);
        console.log('✅ 所有文章迁移完成！');

        const commentsToMigrate = items
            .flatMap(item => item['wp:comment'] ? item['wp:comment'].map(c => ({ ...c, wpPostId: parseInt(item['wp:post_id'][0]) })) : [])
            .filter(c => c['wp:comment_id'] && c['wp:comment_parent'] && c['wp:comment_content'])
            .map(wpComment => ({
                author: wpComment['wp:comment_author'][0],
                authorEmail: wpComment['wp:comment_author_email'][0],
                content: wpComment['wp:comment_content'][0],
                publishDate: new Date(wpComment['wp:comment_date_gmt'][0] + 'Z'),
                wpCommentId: parseInt(wpComment['wp:comment_id'][0]),
                wpParentId: parseInt(wpComment['wp:comment_parent'][0]),
                wpPostId: wpComment.wpPostId
            }));

        console.log(`>>> 发现 ${commentsToMigrate.length} 条有效评论需要迁移...`);
        for (const commentData of commentsToMigrate) {
            const relatedPost = await Post.findOne({ where: { wpPostId: commentData.wpPostId } });
            if (relatedPost) {
                await Comment.create({ ...commentData, PostId: relatedPost.id });
            }
        }
        console.log('✅ 所有评论迁移完成！');
        
        // **修改：现在 Op.ne 可以被正确识别**
        const allComments = await Comment.findAll({ where: { wpParentId: { [Op.ne]: 0 } } });
        for (const childComment of allComments) {
            const parentComment = await Comment.findOne({ where: { wpCommentId: childComment.wpParentId } });
            if (parentComment) {
                childComment.parentCommentId = parentComment.id;
                await childComment.save();
            }
        }
        console.log('✅ 评论回复关系已关联！');

    } catch (error) {
        console.error('迁移过程中发生错误:', error);
    } finally {
        await sequelize.close();
        console.log('--- 数据库连接已关闭。迁移结束。 ---');
    }
}

migrate();
