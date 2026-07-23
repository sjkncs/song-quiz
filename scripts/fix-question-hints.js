// fix-question-hints.js - Remove hint words from question texts
const path = require('path');
const { createClient } = require(path.join('E:\\song_quiz', 'node_modules', '@supabase', 'supabase-js'));

const SUPABASE_URL = 'https://orxenguwlhrgmbqyiyrk.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yeGVuZ3V3bGhyZ21icXlpeXJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDQ3NDAwMSwiZXhwIjoyMTAwMDUwMDAxfQ.NTo_ZvXsbvG02LSMuADAdAtIvlKndc4tEfIKaNO80iU';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const fixes = [
  {
    index_num: 5,
    old: '少年在宴会上借着酒劲，当众「背诵」了上百首中华千古名句，震惊四座。这段名场面出自哪部作品？',
    new: '少年在宴会上借着酒劲，当众背诵了上百首中华千古名句，震惊四座。这段情节出自哪部作品？'
  },
  {
    index_num: 11,
    old: '经典名场面：「你跟我回家，我杀猪养你」这句话最早出现在该剧的第几集？',
    new: '「你跟我回家，我杀猪养你」这句话最早出现在该剧的第几集？'
  },
  {
    index_num: 12,
    old: '经典台词："东京真是富贵迷人眼，深情不堪许"出自哪部剧？',
    new: '"东京真是富贵迷人眼，深情不堪许"出自哪部剧？'
  },
  {
    index_num: 18,
    old: '滴血认亲："这水有问题！" 出自哪部电视剧？',
    new: '"这水有问题！" 这段情节出自哪部电视剧？'
  },
];

async function main() {
  console.log('Removing hint words from question texts...\n');
  let ok = 0;
  for (const f of fixes) {
    const { error } = await supabase
      .from('game_questions')
      .update({ question_text: f.new })
      .eq('index_num', f.index_num);
    if (error) {
      console.log(`❌ Q${f.index_num}: ${error.message}`);
    } else {
      console.log(`✅ Q${f.index_num}: "${f.new}"`);
      ok++;
    }
  }
  console.log(`\nDone: ${ok}/${fixes.length} updated`);
}

main().catch(console.error);
