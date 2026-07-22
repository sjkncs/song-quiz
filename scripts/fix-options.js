// 修复 game_questions 表中被编码损坏的 options 字段
// 运行: node scripts/fix-options.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://orxenguwlhrgmbqyiyrk.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yeGVuZ3V3bGhyZ21icXlpeXJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDQ3NDAwMSwiZXhwIjoyMTAwMDUwMDAxfQ.NTo_ZvXsbvG02LSMuADAdAtIvlKndc4tEfIKaNO80iU';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// 正确的选项数据（从 seed-questions.sql 提取）
const fixes = [
  { index_num: 1, options: [{"index":0,"text":"《喜剧之王》"},{"index":1,"text":"《少林足球》"},{"index":2,"text":"《食神》"},{"index":3,"text":"《功夫》"}] },
  { index_num: 3, options: [{"index":0,"text":"《想见你》"},{"index":1,"text":"《以家人之名》"},{"index":2,"text":"《我可能不会爱你》"},{"index":3,"text":"《下一站是幸福》"}] },
  { index_num: 4, options: [{"index":0,"text":"《头文字D》"},{"index":1,"text":"《速度与激情》"},{"index":2,"text":"《飞驰人生》"},{"index":3,"text":"《赛车总动员》"}] },
  { index_num: 5, options: [{"index":0,"text":"《庆余年》"},{"index":1,"text":"《琅琊榜》"},{"index":2,"text":"《赘婿》"},{"index":3,"text":"《雪中悍刀行》"}] },
  { index_num: 6, options: [{"index":0,"text":"A. 非一般的感觉"},{"index":1,"text":"B. 一切皆有可能"},{"index":2,"text":"C. 我选择，我喜欢"},{"index":3,"text":"D. 多一度热爱"}] },
  { index_num: 7, options: [{"index":0,"text":"《千与千寻》"},{"index":1,"text":"《龙猫》"},{"index":2,"text":"《哈尔的移动城堡》"},{"index":3,"text":"《天空之城》"}] },
  { index_num: 8, options: [{"index":0,"text":"A. 陈奕迅"},{"index":1,"text":"B. 泰勒·斯威夫特"},{"index":2,"text":"C. Black Pink"},{"index":3,"text":"D. 宇多田光"}] },
  { index_num: 9, options: [{"index":0,"text":"A. 一只白色的小猫"},{"index":1,"text":"B. 一个来自伦敦的小女孩"},{"index":2,"text":"C. 一个来自熊本县森林的精灵"},{"index":3,"text":"D. 一只披着猫皮的熊"}] },
  { index_num: 10, options: [{"index":0,"text":"A. Gucci"},{"index":1,"text":"B. Prada"},{"index":2,"text":"C. Louis Vuitton"},{"index":3,"text":"D. Versace 范思哲"}] },
  { index_num: 11, options: [{"index":0,"text":"第5集"},{"index":1,"text":"第8集"},{"index":2,"text":"第12集"},{"index":3,"text":"第15集"}] },
  { index_num: 12, options: [{"index":0,"text":"《梦华录》"},{"index":1,"text":"《知否知否应是绿肥红瘦》"},{"index":2,"text":"《锦心似玉》"},{"index":3,"text":"《星汉灿烂》"}] },
  { index_num: 13, options: [{"index":0,"text":"A. 五月天《仓颉》"},{"index":1,"text":"B. S.H.E《热带雨林》"},{"index":2,"text":"C. 周杰伦《稻香》"},{"index":3,"text":"D. 徐佳莹《身骑白马》"}] },
  { index_num: 17, options: [{"index":0,"text":"《七月与安生》"},{"index":1,"text":"《少年的你》"},{"index":2,"text":"《我的姐姐》"},{"index":3,"text":"《送你一朵小红花》"}] },
  { index_num: 18, options: [{"index":0,"text":"《甄嬛传》"},{"index":1,"text":"《如懿传》"},{"index":2,"text":"《延禧攻略》"},{"index":3,"text":"《步步惊心》"}] },
  { index_num: 19, options: [{"index":0,"text":"《心愿便利贴》chiikawa翻唱"},{"index":1,"text":"《恋爱循环》chiikawa翻唱"},{"index":2,"text":"《小幸运》chiikawa翻唱"},{"index":3,"text":"《告白气球》chiikawa翻唱"}] },
  { index_num: 20, options: [{"index":0,"text":"A. 无语尊者"},{"index":1,"text":"B. 顿悟罗汉"},{"index":2,"text":"C. 沉思罗汉"},{"index":3,"text":"D. 降龙罗汉"}] },
  { index_num: 21, options: [{"index":0,"text":"A. 腾讯游戏"},{"index":1,"text":"B. 任天堂"},{"index":2,"text":"C. 4399"},{"index":3,"text":"D. 米哈游"}] },
  { index_num: 22, options: [{"index":0,"text":"《晴天》"},{"index":1,"text":"《七里香》"},{"index":2,"text":"《简单爱》"},{"index":3,"text":"《夜曲》"}] },
  { index_num: 23, options: [{"index":0,"text":"《海阔天空》"},{"index":1,"text":"《光辉岁月》"},{"index":2,"text":"《真的爱你》"},{"index":3,"text":"《不再犹豫》"}] },
  { index_num: 24, options: [{"index":0,"text":"《浮夸》"},{"index":1,"text":"《十年》"},{"index":2,"text":"《富士山下》"},{"index":3,"text":"《K歌之王》"}] },
  { index_num: 25, options: [{"index":0,"text":"《红豆》"},{"index":1,"text":"《匆匆那年》"},{"index":2,"text":"《传奇》"},{"index":3,"text":"《我愿意》"}] },
  { index_num: 26, options: [{"index":0,"text":"《青花瓷》"},{"index":1,"text":"《东风破》"},{"index":2,"text":"《发如雪》"},{"index":3,"text":"《兰亭序》"}] },
  { index_num: 27, options: [{"index":0,"text":"《小幸运》"},{"index":1,"text":"《那些年》"},{"index":2,"text":"《后来》"},{"index":3,"text":"《遇见》"}] },
  { index_num: 28, options: [{"index":0,"text":"《演员》"},{"index":1,"text":"《丑八怪》"},{"index":2,"text":"《认真的雪》"},{"index":3,"text":"《绅士》"}] },
  { index_num: 29, options: [{"index":0,"text":"《起风了》"},{"index":1,"text":"《大鱼》"},{"index":2,"text":"《光年之外》"},{"index":3,"text":"《夜空中最亮的星》"}] },
  { index_num: 30, options: [{"index":0,"text":"《喜欢你》"},{"index":1,"text":"《情人》"},{"index":2,"text":"《冷雨夜》"},{"index":3,"text":"《大地》"}] },
  { index_num: 31, options: [{"index":0,"text":"《孤勇者》"},{"index":1,"text":"《错位时空》"},{"index":2,"text":"《漠河舞厅》"},{"index":3,"text":"《白月光与朱砂痣》"}] },
  { index_num: 32, options: [{"index":0,"text":"《稻香》"},{"index":1,"text":"《告白气球》"},{"index":2,"text":"《等你下课》"},{"index":3,"text":"《说好不哭》"}] },
  { index_num: 33, options: [{"index":0,"text":"《平凡之路》"},{"index":1,"text":"《后会无期》"},{"index":2,"text":"《生如夏花》"},{"index":3,"text":"《那些花儿》"}] },
  { index_num: 34, options: [{"index":0,"text":"《红日》"},{"index":1,"text":"《月半小夜曲》"},{"index":2,"text":"《护花使者》"},{"index":3,"text":"《一生所爱》"}] },
  { index_num: 35, options: [{"index":0,"text":"《体面》"},{"index":1,"text":"《说散就散》"},{"index":2,"text":"《那些年》"},{"index":3,"text":"《匆匆那年》"}] },
  { index_num: 36, options: [{"index":0,"text":"《漠河舞厅》"},{"index":1,"text":"《错位时空》"},{"index":2,"text":"《大风吹》"},{"index":3,"text":"《星辰大海》"}] },
  { index_num: 37, options: [{"index":0,"text":"《光年之外》"},{"index":1,"text":"《泡沫》"},{"index":2,"text":"《多远都要在一起》"},{"index":3,"text":"《倒数》"}] },
  { index_num: 38, options: [{"index":0,"text":"《告白气球》"},{"index":1,"text":"《甜甜的》"},{"index":2,"text":"《园游会》"},{"index":3,"text":"《星晴》"}] },
  { index_num: 39, options: [{"index":0,"text":"《夜曲》"},{"index":1,"text":"《以父之名》"},{"index":2,"text":"《止战之殇》"},{"index":3,"text":"《暗号》"}] },
  { index_num: 40, options: [{"index":0,"text":"《一生所爱》"},{"index":1,"text":"《追》"},{"index":2,"text":"《风继续吹》"},{"index":3,"text":"《当年情》"}] },
];

async function main() {
  console.log(`修复 ${fixes.length} 道题的 options 字段...\n`);
  let ok = 0, fail = 0;
  for (const f of fixes) {
    const { error } = await supabase
      .from('game_questions')
      .update({ options: f.options })
      .eq('index_num', f.index_num);
    if (error) {
      console.error(`❌ Q${f.index_num}: ${error.message}`);
      fail++;
    } else {
      console.log(`✅ Q${f.index_num}: ${f.options.map(o => o.text).join(' | ')}`);
      ok++;
    }
  }
  console.log(`\n完成: ${ok} 成功, ${fail} 失败`);
}

main();
