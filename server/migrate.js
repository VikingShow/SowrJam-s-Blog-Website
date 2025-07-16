// server/migrate.js

const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const TurndownService = require('turndown');
// **新增：从sequelize中解构出Op操作符**
const { Op } = require('sequelize');

// 使用对象解构来正确地从 database.js 中导入所有内容
const { sequelize, Post, Comment, Tag } = require('./database');

const XML_FILE_PATH = path.join(__dirname, '..', 'sowrhome.WordPress.2025-07-16.xml'); 

async function migrate() {
    const turndownService = new TurndownService();
    try {
        console.log('>>> 正在同步数据库表结构...');
        // 现在 sequelize.sync() 会正常工作
        await sequelize.sync({ force: true });
        console.log('✅ 数据库表结构同步完成！');

        const xmlData = fs.readFileSync(XML_FILE_PATH, 'utf8');
        const result = await new xml2js.Parser().parseStringPromise(xmlData);
        console.log('   - XML文件解析成功。');
        const items = result.rss.channel[0].item;
        
        // 1. 迁移文章
        const postsData = items
            .filter(item => item['wp:post_type'][0] === 'post' && item['wp:status'][0] === 'publish')
            .map(wpPost => ({
                title: wpPost.title[0],
                content: turndownService.turndown(wpPost['content:encoded'][0] || ''),
                publishDate: new Date(wpPost.pubDate[0]),
                status: wpPost['wp:status'][0],
                wpPostId: parseInt(wpPost['wp:post_id'][0]),
                _tags: (wpPost.category || []).filter(c => c.$.domain === 'category').map(c => c._)
            }));
        console.log(`>>> 发现 ${postsData.length} 篇已发布的文章需要迁移...`);
        const createdPosts = await Post.bulkCreate(postsData, { returning: true });
        console.log('✅ 所有文章迁移完成！');

        // 2. 创建所有唯一的标签
        const allTagNames = new Set(postsData.flatMap(p => p._tags));
        const tagsToCreate = [...allTagNames].map(name => ({ name }));
        await Tag.bulkCreate(tagsToCreate);
        console.log(`✅ 创建了 ${tagsToCreate.length} 个唯一标签。`);
        
        // 3. 关联文章和标签
        const allTags = await Tag.findAll();
        const tagMap = new Map(allTags.map(t => [t.name, t.id]));
        for (const post of createdPosts) {
            const postData = postsData.find(p => p.wpPostId === post.wpPostId);
            if (postData && postData._tags.length > 0) {
                const tagIds = postData._tags.map(name => tagMap.get(name)).filter(Boolean);
                await post.setTags(tagIds);
            }
        }
        console.log('✅ 文章和标签关系已关联！');

        // 4. 迁移评论
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
        
        // **修改：现在 [Op.ne] 会正常工作**
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
        // 现在 sequelize.close() 会正常工作
        await sequelize.close();
        console.log('--- 数据库连接已关闭。迁移结束。 ---');
    }
}

migrate();
