// upload-q18-final.js - Upload compressed Q18 video
const fs = require('fs');
const path = require('path');
const { createClient } = require(path.join('E:\\song_quiz', 'node_modules', '@supabase', 'supabase-js'));

const SUPABASE_URL = 'https://orxenguwlhrgmbqyiyrk.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yeGVuZ3V3bGhyZ21icXlpeXJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDQ3NDAwMSwiZXhwIjoyMTAwMDUwMDAxfQ.NTo_ZvXsbvG02LSMuADAdAtIvlKndc4tEfIKaNO80iU';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  const filePath = 'E:\\影视\\甄嬛传_compressed.mp4';
  const storagePath = 'video/q18_zhenhuan.mp4';
  const buf = fs.readFileSync(filePath);
  console.log(`Uploading ${(buf.length / 1024 / 1024).toFixed(1)} MB...`);

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
    console.log(`❌ Upload failed (${res.status}): ${(await res.text()).substring(0, 300)}`);
    return;
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${storagePath}`;
  console.log(`✅ Uploaded: ${publicUrl}`);

  const { error } = await supabase.from('game_questions').update({ media_url: publicUrl }).eq('index_num', 18);
  console.log(error ? `❌ DB: ${error.message}` : '✅ DB updated (Q18)');
}

main().catch(console.error);
