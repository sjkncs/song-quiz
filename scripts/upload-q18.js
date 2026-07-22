// upload-q18.js - Upload the large Q18 甄嬛传 video
const fs = require('fs');
const path = require('path');
const { createClient } = require(path.join('E:\\song_quiz', 'node_modules', '@supabase', 'supabase-js'));

const SUPABASE_URL = 'https://orxenguwlhrgmbqyiyrk.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yeGVuZ3V3bGhyZ21icXlpeXJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDQ3NDAwMSwiZXhwIjoyMTAwMDUwMDAxfQ.NTo_ZvXsbvG02LSMuADAdAtIvlKndc4tEfIKaNO80iU';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  const filePath = 'E:\\影视\\甄嬛传_33m25s-35m06s.mp4';
  const storagePath = 'video/q18_zhenhuan.mp4';

  console.log('Reading file...');
  const buf = fs.readFileSync(filePath);
  console.log(`File size: ${(buf.length / 1024 / 1024).toFixed(1)} MB`);

  console.log('Uploading to Supabase Storage...');
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${storagePath}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Content-Type': 'video/mp4',
      'x-upsert': 'true',
    },
    body: buf,
  });

  if (!res.ok) {
    const text = await res.text();
    console.log(`❌ Upload failed (${res.status}): ${text.substring(0, 500)}`);
    return;
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${storagePath}`;
  console.log(`✅ Uploaded: ${publicUrl}`);

  // Update DB
  const { error } = await supabase
    .from('game_questions')
    .update({ media_url: publicUrl, media_type: 'video' })
    .eq('index_num', 18);

  if (error) {
    console.log(`❌ DB update failed: ${error.message}`);
  } else {
    console.log('✅ DB updated (Q18)');
  }
}

main().catch(console.error);
