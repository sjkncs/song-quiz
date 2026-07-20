-- ============================================================
-- 题库种子数据：40道题（21道原题 + 19道猜歌名补充）
-- 运行：在 Supabase SQL Editor 中执行
-- ============================================================

-- 清空旧数据
DELETE FROM game_questions;

-- 重置序列
ALTER SEQUENCE game_questions_id_seq RESTART WITH 1;

INSERT INTO game_questions (index_num, type, question_text, options, correct_answer, correct_index, answer_explanation, media_url, media_type, source_info, difficulty, is_bonus, bonus_message) VALUES

-- ========== 原题 1-21 ==========

(1, 'video_clip',
 '《喜剧之王》"我养你啊"经典片段，请说出电影名称',
 '[{"index":0,"text":"《喜剧之王》"},{"index":1,"text":"《少林足球》"},{"index":2,"text":"《食神》"},{"index":3,"text":"《功夫》"}]'::jsonb,
 '《喜剧之王》', 0, '周星驰1999年经典喜剧电影',
 NULL, 'video', '喜剧之王 - 周星驰', 'normal', false, NULL),

(2, 'song_guess',
 '听一段歌曲，说出歌曲名称',
 NULL,
 '《偷心》', NULL, '电视剧《繁花》插曲，张学友演唱',
 NULL, 'audio', '繁花 - 2024-01-31', 'normal', false, NULL),

(3, 'video_clip',
 '《想见你》当几经波折的李子维终于见到黄雨萱时，"唯有你也想见我的时候"',
 '[{"index":0,"text":"《想见你》"},{"index":1,"text":"《以家人之名》"},{"index":2,"text":"《我可能不会爱你》"},{"index":3,"text":"《下一站是幸福》"}]'::jsonb,
 '《想见你》', 0, '许光汉、柯佳嬿主演的台湾偶像剧',
 NULL, 'video', '想见你 - 2024-02-22', 'normal', false, NULL),

(4, 'video_clip',
 '《头文字D》与中里毅的山路约战，"如果你跑赢了群马山路所有的车手，我就跟你比一场吧。"',
 '[{"index":0,"text":"《头文字D》"},{"index":1,"text":"《速度与激情》"},{"index":2,"text":"《飞驰人生》"},{"index":3,"text":"《赛车总动员》"}]'::jsonb,
 '《头文字D》', 0, '陈冠希、周杰伦主演，2005年赛车电影',
 NULL, 'video', '头文字D - 陈冠希 Clot联名', 'normal', false, NULL),

(5, 'video_clip',
 '《庆余年》范闲被诬陷抄袭，借着酒劲当场"背诵"了上百首中华千古名句',
 '[{"index":0,"text":"《庆余年》"},{"index":1,"text":"《琅琊榜》"},{"index":2,"text":"《赘婿》"},{"index":3,"text":"《雪中悍刀行》"}]'::jsonb,
 '《庆余年》', 0, '第一季第20集经典片段',
 NULL, 'video', '庆余年 - 2024-05-28', 'normal', false, NULL),

(6, 'text_qa',
 '以下哪一句，是运动品牌安踏的广告语？',
 '[{"index":0,"text":"A. 非一般的感觉"},{"index":1,"text":"B. 一切皆有可能"},{"index":2,"text":"C. 我选择，我喜欢"},{"index":3,"text":"D. 多一度热爱"}]'::jsonb,
 'C. 我选择，我喜欢', 2, '安踏经典广告语，代言人为科比等球星',
 NULL, NULL, '安踏 - 2024-07-26', 'normal', false, NULL),

(7, 'song_guess',
 '听一段歌曲，这首歌曲出自哪一部吉卜力动画作品？',
 '[{"index":0,"text":"《千与千寻》"},{"index":1,"text":"《龙猫》"},{"index":2,"text":"《哈尔的移动城堡》"},{"index":3,"text":"《天空之城》"}]'::jsonb,
 '《龙猫》', 1, '《邻家的龙猫》（となりのトトロ）是龙猫的主题曲',
 NULL, 'audio', '吉卜力 - 2024-07-10', 'normal', false, NULL),

(8, 'text_qa',
 '樊振东曾经因为比赛前去看了一位歌手的演唱会，结果那站比赛爆冷输了球，请问他去看的是哪位歌手的演唱会？',
 '[{"index":0,"text":"A. 陈奕迅"},{"index":1,"text":"B. 泰勒·斯威夫特"},{"index":2,"text":"C. Black Pink"},{"index":3,"text":"D. 宇多田光"}]'::jsonb,
 'B. 泰勒·斯威夫特', 1, '樊振东看Taylor Swift演唱会后比赛爆冷',
 NULL, NULL, '樊振东 - 2024-09-23', 'normal', false, NULL),

(9, 'text_qa',
 '根据三丽鸥官方设定，Hello Kitty的真实身份是什么？',
 '[{"index":0,"text":"A. 一只白色的小猫"},{"index":1,"text":"B. 一个来自伦敦的小女孩"},{"index":2,"text":"C. 一个来自熊本县森林的精灵"},{"index":3,"text":"D. 一只披着猫皮的熊"}]'::jsonb,
 'B. 一个来自伦敦的小女孩', 1, '三丽鸥官方设定Hello Kitty是一个小女孩，不是猫',
 NULL, NULL, 'Hello Kitty - 2024-12-20', 'hard', true, '本题较难，答对可额外获得周边奖励！'),

(10, 'text_qa',
 'FENDI与以下哪个品牌，属于同一个时尚品牌集团？',
 '[{"index":0,"text":"A. Gucci"},{"index":1,"text":"B. Prada"},{"index":2,"text":"C. Louis Vuitton"},{"index":3,"text":"D. Versace 范思哲"}]'::jsonb,
 'C. Louis Vuitton', 2, 'FENDI和LV都属于LVMH集团',
 NULL, NULL, 'FENDI - LVMH', 'normal', false, NULL),

(11, 'video_clip',
 '《逐玉》"你跟我回家，我杀猪养你"最早出现在第几集？',
 '[{"index":0,"text":"第5集"},{"index":1,"text":"第8集"},{"index":2,"text":"第12集"},{"index":3,"text":"第15集"}]'::jsonb,
 '第8集', 1, '田曦薇主演的古装剧经典台词',
 NULL, 'video', '逐玉 - 田曦薇', 'normal', false, NULL),

(12, 'video_clip',
 '经典台词："东京真是富贵迷人眼，深情不堪许"出自哪部剧？',
 '[{"index":0,"text":"《梦华录》"},{"index":1,"text":"《知否知否应是绿肥红瘦》"},{"index":2,"text":"《锦心似玉》"},{"index":3,"text":"《星汉灿烂》"}]'::jsonb,
 '《梦华录》', 0, '第7集赵盼儿与欧阳旭决裂的经典台词',
 NULL, 'video', '梦华录 - 第7集', 'normal', false, NULL),

(13, 'text_qa',
 '以下哪一首歌曲是由方文山作词的？',
 '[{"index":0,"text":"A. 五月天《仓颉》"},{"index":1,"text":"B. S.H.E《热带雨林》"},{"index":2,"text":"C. 周杰伦《稻香》"},{"index":3,"text":"D. 徐佳莹《身骑白马》"}]'::jsonb,
 'B. S.H.E《热带雨林》', 1, '方文山为S.H.E作词的《热带雨林》',
 NULL, NULL, '方文山', 'hard', false, NULL),

(14, 'text_qa',
 '请说出三部鲁迅作品的名称（散文或小说均可）',
 NULL,
 '《狂人日记》《阿Q正传》《孔乙己》《故乡》《药》《祝福》等', NULL,
 '答出任意三部即可。鲁迅代表作还包括《从百草园到三味书屋》《藤野先生》等',
 NULL, NULL, '作家语录', 'hard', true, '本题较难，答对可额外获得周边奖励！'),

(15, 'song_guess',
 '听一段歌曲，说出歌曲名称',
 NULL,
 '《Kill This Love》', NULL, 'BlackPink (Lisa等) 2019年发行的热门单曲',
 NULL, 'audio', 'BlackPink - Kill This Love', 'normal', false, NULL),

(16, 'song_guess',
 '听一段歌曲，说出歌曲名称（国语版或粤语版均可）',
 NULL,
 '《见习爱神》/《明爱暗恋补习社》', NULL, 'Twins的代表作，国语版《见习爱神》，粤语版《明爱暗恋补习社》',
 NULL, 'audio', 'Twins', 'normal', false, NULL),

(17, 'video_clip',
 '浴室对峙戏，说出这部电影的名称',
 '[{"index":0,"text":"《七月与安生》"},{"index":1,"text":"《少年的你》"},{"index":2,"text":"《我的姐姐》"},{"index":3,"text":"《送你一朵小红花》"}]'::jsonb,
 '《七月与安生》', 0, '马思纯、周冬雨主演，浴室对峙是全片高潮',
 NULL, 'video', '七月与安生 - 马思纯', 'normal', false, NULL),

(18, 'video_clip',
 '滴血认亲："这水有问题！" 出自哪部电视剧？',
 '[{"index":0,"text":"《甄嬛传》"},{"index":1,"text":"《如懿传》"},{"index":2,"text":"《延禧攻略》"},{"index":3,"text":"《步步惊心》"}]'::jsonb,
 '《甄嬛传》', 0, '经典宫斗剧，滴血认亲名场面',
 NULL, 'video', '甄嬛传', 'easy', false, NULL),

(19, 'song_guess',
 '听一段歌曲，说出歌曲名称及翻唱者名称',
 '[{"index":0,"text":"《心愿便利贴》chiikawa翻唱"},{"index":1,"text":"《恋爱循环》chiikawa翻唱"},{"index":2,"text":"《小幸运》chiikawa翻唱"},{"index":3,"text":"《告白气球》chiikawa翻唱"}]'::jsonb,
 '《心愿便利贴》 chiikawa', 0, 'Chiikawa动画翻唱元卫觉醒的《心愿便利贴》',
 NULL, 'audio', 'Chiikawa - 心愿便利贴', 'normal', false, NULL),

(20, 'text_qa',
 '景德镇中国陶瓷博物馆里"无语菩萨"的官方"身份证"名字是？',
 '[{"index":0,"text":"A. 无语尊者"},{"index":1,"text":"B. 顿悟罗汉"},{"index":2,"text":"C. 沉思罗汉"},{"index":3,"text":"D. 降龙罗汉"}]'::jsonb,
 'C. 沉思罗汉', 2, '官方名称为"沉思罗汉"，因表情神似"无语"走红网络',
 NULL, NULL, '景德镇陶瓷博物馆', 'hard', true, '本题较难，答对可额外获得周边奖励！'),

(21, 'text_qa',
 '《原神》这款游戏是由以下哪家公司开发的？',
 '[{"index":0,"text":"A. 腾讯游戏"},{"index":1,"text":"B. 任天堂"},{"index":2,"text":"C. 4399"},{"index":3,"text":"D. 米哈游"}]'::jsonb,
 'D. 米哈游', 3, '原神由米哈游(miHoYo)开发',
 NULL, NULL, '原神', 'easy', false, NULL),

-- ========== 猜歌名补充 22-40 ==========

(22, 'song_guess',
 '听一段歌曲前奏，猜出歌曲名称',
 '[{"index":0,"text":"《晴天》"},{"index":1,"text":"《七里香》"},{"index":2,"text":"《简单爱》"},{"index":3,"text":"《夜曲》"}]'::jsonb,
 '《晴天》', 0, '周杰伦2003年《叶惠美》专辑，经典吉他前奏',
 NULL, 'audio', '周杰伦 - 晴天', 'normal', false, NULL),

(23, 'song_guess',
 '听一段歌曲，猜出歌曲名称',
 '[{"index":0,"text":"《海阔天空》"},{"index":1,"text":"《光辉岁月》"},{"index":2,"text":"《真的爱你》"},{"index":3,"text":"《不再犹豫》"}]'::jsonb,
 '《海阔天空》', 0, 'Beyond 1993年经典，黄家驹代表作',
 NULL, 'audio', 'Beyond - 海阔天空', 'normal', false, NULL),

(24, 'song_guess',
 '听一段歌曲，猜出歌曲名称',
 '[{"index":0,"text":"《浮夸》"},{"index":1,"text":"《十年》"},{"index":2,"text":"《富士山下》"},{"index":3,"text":"《K歌之王》"}]'::jsonb,
 '《浮夸》', 0, '陈奕迅2005年《U87》专辑，演唱会必唱曲目',
 NULL, 'audio', '陈奕迅 - 浮夸', 'hard', false, NULL),

(25, 'song_guess',
 '听一段歌曲，猜出歌曲名称',
 '[{"index":0,"text":"《红豆》"},{"index":1,"text":"《匆匆那年》"},{"index":2,"text":"《传奇》"},{"index":3,"text":"《我愿意》"}]'::jsonb,
 '《红豆》', 0, '王菲1998年经典情歌',
 NULL, 'audio', '王菲 - 红豆', 'normal', false, NULL),

(26, 'song_guess',
 '听一段歌曲，猜出歌曲名称',
 '[{"index":0,"text":"《青花瓷》"},{"index":1,"text":"《东风破》"},{"index":2,"text":"《发如雪》"},{"index":3,"text":"《兰亭序》"}]'::jsonb,
 '《青花瓷》', 0, '周杰伦2007年《我很忙》专辑，方文山作词',
 NULL, 'audio', '周杰伦 - 青花瓷', 'normal', false, NULL),

(27, 'song_guess',
 '听一段歌曲，猜出歌曲名称',
 '[{"index":0,"text":"《小幸运》"},{"index":1,"text":"《那些年》"},{"index":2,"text":"《后来》"},{"index":3,"text":"《遇见》"}]'::jsonb,
 '《小幸运》', 0, '田馥甄演唱，电影《我的少女时代》主题曲',
 NULL, 'audio', '田馥甄 - 小幸运', 'easy', false, NULL),

(28, 'song_guess',
 '听一段歌曲，猜出歌曲名称',
 '[{"index":0,"text":"《演员》"},{"index":1,"text":"《丑八怪》"},{"index":2,"text":"《认真的雪》"},{"index":3,"text":"《绅士》"}]'::jsonb,
 '《演员》', 0, '薛之谦2015年代表作',
 NULL, 'audio', '薛之谦 - 演员', 'normal', false, NULL),

(29, 'song_guess',
 '听一段歌曲，猜出歌曲名称',
 '[{"index":0,"text":"《起风了》"},{"index":1,"text":"《大鱼》"},{"index":2,"text":"《光年之外》"},{"index":3,"text":"《夜空中最亮的星》"}]'::jsonb,
 '《起风了》', 0, '买辣椒也用券演唱，改编自高桥优的《ヤキモチ》',
 NULL, 'audio', '买辣椒也用券 - 起风了', 'hard', true, '本题较难，答对可额外获得周边奖励！'),

(30, 'song_guess',
 '听一段粤语歌曲，猜出歌曲名称',
 '[{"index":0,"text":"《喜欢你》"},{"index":1,"text":"《情人》"},{"index":2,"text":"《冷雨夜》"},{"index":3,"text":"《大地》"}]'::jsonb,
 '《喜欢你》', 0, 'Beyond 1988年经典粤语情歌',
 NULL, 'audio', 'Beyond - 喜欢你', 'normal', false, NULL),

(31, 'song_guess',
 '听一段歌曲，猜出歌曲名称',
 '[{"index":0,"text":"《孤勇者》"},{"index":1,"text":"《错位时空》"},{"index":2,"text":"《漠河舞厅》"},{"index":3,"text":"《白月光与朱砂痣》"}]'::jsonb,
 '《孤勇者》', 0, '陈奕迅2021年为《英雄联盟：双城之战》演唱的主题曲',
 NULL, 'audio', '陈奕迅 - 孤勇者', 'easy', false, NULL),

(32, 'song_guess',
 '听一段歌曲，猜出歌曲名称',
 '[{"index":0,"text":"《稻香》"},{"index":1,"text":"《告白气球》"},{"index":2,"text":"《等你下课》"},{"index":3,"text":"《说好不哭》"}]'::jsonb,
 '《稻香》', 0, '周杰伦2008年《魔杰座》专辑，温暖的励志歌曲',
 NULL, 'audio', '周杰伦 - 稻香', 'normal', false, NULL),

(33, 'song_guess',
 '听一段歌曲，猜出歌曲名称',
 '[{"index":0,"text":"《平凡之路》"},{"index":1,"text":"《后会无期》"},{"index":2,"text":"《生如夏花》"},{"index":3,"text":"《那些花儿》"}]'::jsonb,
 '《平凡之路》', 0, '朴树2014年复出作品，电影《后会无期》主题曲',
 NULL, 'audio', '朴树 - 平凡之路', 'normal', false, NULL),

(34, 'song_guess',
 '听一段粤语歌曲，猜出歌曲名称',
 '[{"index":0,"text":"《红日》"},{"index":1,"text":"《月半小夜曲》"},{"index":2,"text":"《护花使者》"},{"index":3,"text":"《一生所爱》"}]'::jsonb,
 '《红日》', 0, '李克勤1992年经典粤语励志歌曲',
 NULL, 'audio', '李克勤 - 红日', 'hard', false, NULL),

(35, 'song_guess',
 '听一段歌曲，猜出歌曲名称',
 '[{"index":0,"text":"《体面》"},{"index":1,"text":"《说散就散》"},{"index":2,"text":"《那些年》"},{"index":3,"text":"《匆匆那年》"}]'::jsonb,
 '《体面》', 0, '于文文演唱，电影《前任3》插曲',
 NULL, 'audio', '于文文 - 体面', 'normal', false, NULL),

(36, 'song_guess',
 '听一段歌曲，猜出歌曲名称',
 '[{"index":0,"text":"《漠河舞厅》"},{"index":1,"text":"《错位时空》"},{"index":2,"text":"《大风吹》"},{"index":3,"text":"《星辰大海》"}]'::jsonb,
 '《漠河舞厅》', 0, '柳爽2020年创作，纪念大兴安岭火灾中的爱情故事',
 NULL, 'audio', '柳爽 - 漠河舞厅', 'hard', true, '本题较难，答对可额外获得周边奖励！'),

(37, 'song_guess',
 '听一段歌曲，猜出歌曲名称',
 '[{"index":0,"text":"《光年之外》"},{"index":1,"text":"《泡沫》"},{"index":2,"text":"《多远都要在一起》"},{"index":3,"text":"《倒数》"}]'::jsonb,
 '《光年之外》', 0, '邓紫棋演唱，电影《太空旅客》中文主题曲',
 NULL, 'audio', '邓紫棋 - 光年之外', 'normal', false, NULL),

(38, 'song_guess',
 '听一段歌曲，猜出歌曲名称',
 '[{"index":0,"text":"《告白气球》"},{"index":1,"text":"《甜甜的》"},{"index":2,"text":"《园游会》"},{"index":3,"text":"《星晴》"}]'::jsonb,
 '《告白气球》', 0, '周杰伦2016年《周杰伦的床边故事》专辑',
 NULL, 'audio', '周杰伦 - 告白气球', 'easy', false, NULL),

(39, 'song_guess',
 '听一段歌曲，猜出歌曲名称',
 '[{"index":0,"text":"《夜曲》"},{"index":1,"text":"《以父之名》"},{"index":2,"text":"《止战之殇》"},{"index":3,"text":"《暗号》"}]'::jsonb,
 '《夜曲》', 0, '周杰伦2005年《十一月的萧邦》专辑',
 NULL, 'audio', '周杰伦 - 夜曲', 'hard', false, NULL),

(40, 'song_guess',
 '听一段粤语歌曲，猜出歌曲名称',
 '[{"index":0,"text":"《一生所爱》"},{"index":1,"text":"《追》"},{"index":2,"text":"《风继续吹》"},{"index":3,"text":"《当年情》"}]'::jsonb,
 '《一生所爱》', 0, '卢冠廷演唱，电影《大话西游》经典插曲',
 NULL, 'audio', '卢冠廷 - 一生所爱', 'hard', true, '本题较难，答对可额外获得周边奖励！');
