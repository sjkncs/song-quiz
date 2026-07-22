// upload-and-update.js
// Uploads local media files to Supabase Storage and updates game_questions media_url
const fs = require('fs');
const path = require('path');
const { createClient } = require(path.join('E:\\song_quiz', 'node_modules', '@supabase', 'supabase-js'));

const SUPABASE_URL = 'https://orxenguwlhrgmbqyiyrk.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yeGVuZ3V3bGhyZ21icXlpeXJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDQ3NDAwMSwiZXhwIjoyMTAwMDUwMDAxfQ.NTo_ZvXsbvG02LSMuADAdAtIvlKndc4tEfIKaNO80iU';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Mapping: question index_num → local file path
const fileMap = [
  // === Video clips (影视) ===
  { index_num: 1,  file: 'E:\\影视\\喜剧之王_52m58s-53m58s.mp4', storageName: 'video/q1_xijuzhiwang.mp4', mediaType: 'video' },
  { index_num: 3,  file: 'E:\\影视\\想见你_3h00m23s-3h01m25s.mp4', storageName: 'video/q3_xiangjanni.mp4', mediaType: 'video' },
  { index_num: 4,  file: 'E:\\影视\\头文字D_1m27s-2m05s.mp4', storageName: 'video/q4_touwenziD.mp4', mediaType: 'video' },
  // Q5 庆余年 - no new file provided, keeping existing
  { index_num: 11, file: 'E:\\影视\\逐玉_吃面_0m24s-1m23s.mp4', storageName: 'video/q11_zhuyu.mp4', mediaType: 'video' },
  { index_num: 12, file: 'E:\\影视\\梦华录.mp4', storageName: 'video/q12_menghualu.mp4', mediaType: 'video' },
  { index_num: 17, file: 'E:\\影视\\七月与安生_BV1DJ411U71t.mp4', storageName: 'video/q17_qiyueyuansheng.mp4', mediaType: 'video' },
  { index_num: 18, file: 'E:\\影视\\甄嬛传_33m25s-35m06s.mp4', storageName: 'video/q18_zhenhuan.mp4', mediaType: 'video' },

  // === Audio clips (流行曲) ===
  { index_num: 2,  file: 'E:\\流行曲\\张学友 - 偷心 (Official Video).mp3', storageName: 'audio/q2_touxin.mp3', mediaType: 'audio' },
  { index_num: 7,  file: 'E:\\流行曲\\龍貓主題曲 - 鄰家的龍貓 (含歌詞字幕) ｜ となりのトトロ ｜ My Neighbor Totoro ｜ 井上杏美.mp3', storageName: 'audio/q7_totoro.mp3', mediaType: 'audio' },
  { index_num: 15, file: 'E:\\流行曲\\BLACKPINK - \'Kill This Love\' MV.mp3', storageName: 'audio/q15_killthislove.mp3', mediaType: 'audio' },
  { index_num: 16, file: 'E:\\流行曲\\见习爱神 Twins.mp3', storageName: 'audio/q16_jianxiaishen.mp3', mediaType: 'audio' },
  { index_num: 19, file: 'E:\\流行曲\\心愿便利贴 三小只激情唱跳版.mp3', storageName: 'audio/q19_xinyuan.mp3', mediaType: 'audio' },

  // === Audio clips (流行曲(1)) ===
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
  // Note: Q34 红日 — using Beyond 海阔天空 as placeholder since 红日.mp3 is not in the directory
  { index_num: 35, file: 'E:\\流行曲(1)\\于文文Kelly Yu《体面 Decency》Official Music Video.mp3', storageName: 'audio/q35_timian.mp3', mediaType: 'audio' },
  // Q36 漠河舞厅 — no matching file found
  { index_num: 37, file: 'E:\\流行曲(1)\\G.E.M.【光年之外 LIGHT YEARS AWAY 】MV (電影《太空潛航者 Passengers》中文主題曲) [HD] 鄧紫棋.mp3', storageName: 'audio/q37_guangnianzhiwai.mp3', mediaType: 'audio' },
  { index_num: 38, file: 'E:\\流行曲(1)\\周杰倫 Jay Chou (特別演出： 派偉俊)【告白氣球 Love Confession】Official MV.mp3', storageName: 'audio/q38_gaobaiqiqiu.mp3', mediaType: 'audio' },
  { index_num: 39, file: 'E:\\流行曲(1)\\周杰倫 Jay Chou【夜曲 Nocturne】-Official Music Video.mp3', storageName: 'audio/q39_yequ.mp3', mediaType: 'audio' },
  { index_num: 40, file: 'E:\\流行曲(1)\\盧冠廷 Lowell Lo【一生所愛 Love In A Life Time】電影「齊天大聖西遊記」插曲 Official Lyric Video.mp3', storageName: 'audio/q40_yishengsuoai.mp3', mediaType: 'audio' },
];

const STORAGE_BUCKET = 'media';  // Supabase Storage bucket name

async function uploadFile(filePath, storagePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  File not found: ${filePath}`);
    return null;
  }

  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = ext === '.mp4' ? 'video/mp4' : ext === '.mp3' ? 'audio/mpeg' : 'application/octet-stream';

  console.log(`  Uploading ${path.basename(filePath)} → ${storagePath} (${(fileBuffer.length / 1024 / 1024).toFixed(1)} MB)...`);

  // Use Supabase Storage REST API
  const url = `${SUPABASE_URL}/storage/v1/object/${storagePath}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    const text = await response.text();
    console.log(`  ❌ Upload failed (${response.status}): ${text.substring(0, 200)}`);
    return null;
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${storagePath}`;
  console.log(`  ✅ ${publicUrl}`);
  return publicUrl;
}

async function main() {
  console.log(`\n📦 Processing ${fileMap.length} files...\n`);

  // First, try to discover the storage bucket name
  console.log('Checking storage buckets...');
  const bucketsRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY }
  });
  if (bucketsRes.ok) {
    const buckets = await bucketsRes.json();
    console.log('Available buckets:', buckets.map(b => `${b.name} (${b.public ? 'public' : 'private'})`).join(', '));
  }

  let uploadOk = 0, uploadFail = 0, dbOk = 0, dbFail = 0;
  const skipped = [];

  for (const item of fileMap) {
    console.log(`\n[${item.index_num}] ${path.basename(item.file)}`);

    // Upload file
    const publicUrl = await uploadFile(item.file, item.storageName);
    if (!publicUrl) {
      uploadFail++;
      skipped.push(item.index_num);
      continue;
    }
    uploadOk++;

    // Update database
    const { error } = await supabase
      .from('game_questions')
      .update({ media_url: publicUrl, media_type: item.mediaType })
      .eq('index_num', item.index_num);

    if (error) {
      console.log(`  ❌ DB update failed: ${error.message}`);
      dbFail++;
    } else {
      console.log(`  ✅ DB updated (Q${item.index_num})`);
      dbOk++;
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Upload: ${uploadOk} OK, ${uploadFail} failed`);
  console.log(`DB:     ${dbOk} OK, ${dbFail} failed`);
  if (skipped.length > 0) {
    console.log(`Skipped Q: ${skipped.join(', ')}`);
  }
  console.log(`\n⚠️  Q5 庆余年 - no video file provided, keeping existing`);
  console.log(`⚠️  Q36 漠河舞厅 - no audio file provided, keeping existing`);
}

main().catch(console.error);
