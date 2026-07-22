// fix-video-questions.js - Set options to NULL for all video_clip questions
const path = require('path');
const { createClient } = require(path.join('E:\\song_quiz', 'node_modules', '@supabase', 'supabase-js'));

const SUPABASE_URL = 'https://orxenguwlhrgmbqyiyrk.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yeGVuZ3V3bGhyZ21icXlpeXJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDQ3NDAwMSwiZXhwIjoyMTAwMDUwMDAxfQ.NTo_ZvXsbvG02LSMuADAdAtIvlKndc4tEfIKaNO80iU';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const videoQuestions = [1, 3, 4, 5, 11, 12, 17, 18];

async function main() {
  console.log('Setting options to NULL for video_clip questions...\n');
  let ok = 0;
  for (const num of videoQuestions) {
    const { error } = await supabase
      .from('game_questions')
      .update({ options: null })
      .eq('index_num', num);
    if (error) {
      console.log(`❌ Q${num}: ${error.message}`);
    } else {
      console.log(`✅ Q${num}: options → NULL (free-text)`);
      ok++;
    }
  }
  console.log(`\nDone: ${ok}/${videoQuestions.length} updated`);
}

main().catch(console.error);
