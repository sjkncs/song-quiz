// upload-remaining.js - Continue uploading Q18-Q40 files
const fs = require('fs');
const path = require('path');
const { createClient } = require(path.join('E:\\song_quiz', 'node_modules', '@supabase', 'supabase-js'));

const SUPABASE_URL = 'https://orxenguwlhrgmbqyiyrk.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yeGVuZ3V3bGhyZ21icXlpeXJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDQ3NDAwMSwiZXhwIjoyMTAwMDUwMDAxfQ.NTo_ZvXsbvG02LSMuADAdAtIvlKndc4tEfIKaNO80iU';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const fileMap = [
  { index_num: 18, file: 'E:\\影视\\甄嬛传_33m25s-35m06s.mp4', storageName: 'video/q18_zhenhuan.mp4', mediaType: 'video' },
  { index_num: 22, file: 'E:\\流行曲(1)\\周杰倫 Jay Chou【晴天 Sunny Day】-Official Music Video.mp3', storageName: 'audio/q22_qingtian.mp3', mediaType: 'audio' },
  { index_num: 23, file: 'E:\\流行曲(1)\\BEYOND【海闊天空】Music Video (粵) (HD).mp3', storageName: 'audio/q23_haikuotiankong.mp3', mediaType: 'audio' },
  { index_num: 24, file: 'E:\\流行曲(1)\\浮夸 陈奕迅 (歌词版).mp3', storageName: 'audio/q24_fukua.mp3', mediaType: 'audio' },
  { index_num: 25, file: 'E:\\流行曲(1)\\王菲 - 紅豆.mp3', storageName: 'audio/q25_hongdou.mp3', mediaType: 'audio' },
  { index_num: 26, file: 'E:\\流行曲(1)\\周杰倫 Jay Chou【青花瓷 Blue and White Porcelain】-Official Music Video.mp3', storageName: 'audio/q26_qinghuaci.mp3', mediaType: 'audio' },
  { index_num: 27, file: 'E:\\流行曲(1)\\田馥甄  Hebe Tien 《小幸運》.mp3', storageName: 'audio/q27_xiaoxingyun.mp3', mediaType: 'audio' },
  { index_num: 28, file: 'E:\\流行曲(1)\\薛之謙 Joker Xue【演員】Official Music Video.mp3', storageName: 'audio/q28_yanyuan.mp3', mediaType: 'audio' },
  { index_num: 29, file: 'E:\\流行曲(1)\\起風了 (新版)【動態歌詞Lyrics】.mp3', storageName: 'audio/q29_qifengle.mp3', mediaType: 'audio' },
  { index_num: 30, file: 'E:\\流行曲(1)\\Beyond - 喜歡妳 (Official Music Video).mp3', storageName: 'audio/q30_xihuanqi.mp3', mediaType: 'audio' },
  { index_num: 31, file: 'E:\\流行曲(1)\\《孤勇者》（《英雄聯盟：雙城之戰》動畫劇集中文主題曲）陳奕迅 Eason Chan [Official MV].mp3', storageName: 'audio/q31_guyongzhe.mp3', mediaType: 'audio' },
  { index_num: 32, file: 'E:\\流行曲(1)\\周杰倫 Jay Chou【稻香 Rice Field】-Official Music Video.mp3', storageName: 'audio/q32_daoxiang.mp3', mediaType: 'audio' },
  { index_num: 33, file: 'E:\\流行曲(1)\\朴树《平凡之路》Official MV.mp3', storageName: 'audio/q33_pingfan.mp3', mediaType: 'audio' },
  { index_num: 34, file: 'E:\\流行曲(1)\\BEYOND【海闊天空】Music Video (粵) (HD).mp3', storageName: 'audio/q34_hongri.mp3', mediaType: 'audio' },
  { index_num: 35, file: 'E:\\流行曲(1)\\于文文Kelly Yu《体面 Decency》Official Music Video.mp3', storageName: 'audio/q35_timian.mp3', mediaType: 'audio' },
  { index_num: 37, file: 'E:\\流行曲(1)\\G.E.M.【光年之外 LIGHT YEARS AWAY 】MV (電影《太空潛航者 Passengers》中文主題曲) [HD] 鄧紫棋.mp3', storageName: 'audio/q37_guangnianzhiwai.mp3', mediaType: 'audio' },
  { index_num: 38, file: 'E:\\流行曲(1)\\周杰倫 Jay Chou (特別演出： 派偉俊)【告白氣球 Love Confession】Official MV.mp3', storageName: 'audio/q38_gaobaiqiqiu.mp3', mediaType: 'audio' },
  { index_num: 39, file: 'E:\\流行曲(1)\\周杰倫 Jay Chou【夜曲 Nocturne】-Official Music Video.mp3', storageName: 'audio/q39_yequ.mp3', mediaType: 'audio' },
  { index_num: 40, file: 'E:\\流行曲(1)\\盧冠廷 Lowell Lo【一生所愛 Love In A Life Time】電影「齊天大聖西遊記」插曲 Official Lyric Video.mp3', storageName: 'audio/q40_yishengsuoai.mp3', mediaType: 'audio' },
];

async function uploadAndSave(item) {
  if (!fs.existsSync(item.file)) {
    console.log(`  [Q${item.index_num}] ⚠️ File not found: ${item.file}`);
    return false;
  }
  const buf = fs.readFileSync(item.file);
  const ext = path.extname(item.file).toLowerCase();
  const ct = ext === '.mp4' ? 'video/mp4' : 'audio/mpeg';
  const sizeMB = (buf.length / 1024 / 1024).toFixed(1);

  console.log(`  [Q${item.index_num}] Uploading ${path.basename(item.file)} (${sizeMB} MB)...`);

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${item.storageName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Content-Type': ct,
      'x-upsert': 'true',
    },
    body: buf,
  });

  if (!res.ok) {
    const text = await res.text();
    console.log(`  [Q${item.index_num}] ❌ Upload failed (${res.status}): ${text.substring(0, 200)}`);
    return false;
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${item.storageName}`;

  const { error } = await supabase
    .from('game_questions')
    .update({ media_url: publicUrl, media_type: item.mediaType })
    .eq('index_num', item.index_num);

  if (error) {
    console.log(`  [Q${item.index_num}] ❌ DB failed: ${error.message}`);
    return false;
  }

  console.log(`  [Q${item.index_num}] ✅ Done`);
  return true;
}

async function main() {
  console.log(`\n📦 Uploading ${fileMap.length} remaining files (Q18-Q40)...\n`);
  let ok = 0, fail = 0;

  for (const item of fileMap) {
    const success = await uploadAndSave(item);
    if (success) ok++; else fail++;
  }

  console.log(`\n${'='.repeat(40)}`);
  console.log(`Results: ${ok} OK, ${fail} failed`);
}

main().catch(console.error);
